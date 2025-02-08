package main

import (
	"context"
	"dagger/ci/internal/dagger"
	"fmt"

	"golang.org/x/sync/errgroup"
)

type Ci struct {
	Source    *dagger.Directory // +private
	Container *dagger.Container // +private
}

func New(
	// Project source directory.
	// +defaultPath="/"
	// +ignore=[".git", "**/node_modules"]
	source *dagger.Directory,
	// SSH socket
	// +optional
	sock *dagger.Socket,

	// NPM token
	// +optional
	npmToken *dagger.Secret,
) *Ci {
	dependencyFiles := dag.
		Directory().
		WithFile("package.json", source.File("package.json"))

	m := dag.
		Node().
		WithYarn().
		WithSource(dependencyFiles).
		Install().
		WithSource(source).
		Container().
		WithEnvVariable("KOBITON_ENVIRONMENT", "standalone").
		WithExec([]string{"git", "config", "--global", "user.email", "'kobiton@kobiton.com'"}).
		WithExec([]string{"git", "config", "--global", "user.name", "'Kobiton'"}).
		WithExec([]string{"git", "init", "."}).
		WithExec([]string{"git", "commit", "--allow-empty", "-m", "init"})

	return &Ci{
		Source:    source,
		Container: m,
	}
}

func (m *Ci) Generate(name string) *dagger.File {
	path := fmt.Sprintf("/work/src/ui-bundle-%s/css", name)
	return m.Container.
		WithExec([]string{"sh", "-c",
			fmt.Sprintf("find %s -type f -not -name 'site.css' -name '*.css' -exec cat {} \\; | npx postcss --use postcss-import postcss-clean --no-map > %s/temp.css", path, path)}).
		WithExec([]string{"sh", "-c", fmt.Sprintf("sed -i 's|/\\*.*\\*/||g' %s/temp.css", path)}).
		WithExec([]string{"sh", "-c", fmt.Sprintf("echo \"/* DO NOT EDIT: 'site.css' is auto-generated from the minified output of 'default-styles.css' and 'custom-styles.css'. */\n$(cat %s/temp.css)\" > %s/temp.css", path, path)}).
		File(path + "/temp.css")
}

// Build the project
func (m *Ci) Build() (*dagger.Directory, error) {
	var eg errgroup.Group

	var docs *dagger.Directory
	eg.Go(func() error {
		docs = m.Container.
			WithFile("/work/src/ui-bundle-docs/css/site.css", m.Generate("docs")).
			WithExec([]string{"yarn", "build-docs:ci"}).
			Directory("/work/src/build/docs")
		return nil
	})
	var widget *dagger.Directory
	eg.Go(func() error {
		widget = m.Container.
			WithFile("/work/src/ui-bundle-docs/css/site.css", m.Generate("widget")).
			WithExec([]string{"yarn", "build-widget:ci"}).
			Directory("/work/src/build/widget")
		return nil
	})

	if err := eg.Wait(); err != nil {
		return nil, err
	}

	return dag.Directory().
		WithDirectory("/docs", docs).
		WithDirectory("/widget", widget), nil
}

// Create a production image
func (m *Ci) Server(
	// Site to build
	site string,
) *dagger.Container {
	dir, _ := m.Build()

	path := fmt.Sprintf("/%s", site)

	return dag.Container(dagger.ContainerOpts{Platform: "linux/amd64"}).
		From("nginx:alpine").
		WithWorkdir(path).
		WithDirectory(path, dir.Directory(site)).
		WithFile(fmt.Sprintf("/%s/replace-env-vars.sh", site), m.Source.File("scripts/replace-env-vars.sh")).
		WithFile("/etc/nginx/nginx.conf", m.Source.File(fmt.Sprintf("docker/%s/nginx.conf", site))).
		WithFile("/etc/nginx/mime.types", m.Source.File("docker/mime.types")).
		WithFile(fmt.Sprintf("/%s/_/js/vendor/mermaid.min.js", site), m.Source.File("assets/js/mermaid.min.js")).
		WithExec([]string{"apk", "add", "--no-cache", "bash"}).
		WithDefaultArgs([]string{"sh", "-c", fmt.Sprintf("/bin/bash /%s/replace-env-vars.sh /%s && nginx -g 'daemon off;'", site, site)}).
		WithExposedPort(80)
}

func (m *Ci) ServerDocs() *dagger.Service {
	return m.Server("docs").AsService()
}

// Publish image to ECR repo
func (m *Ci) Publish(
	ctx context.Context,

	// AWS Access Key ID
	// +optional
	awsAccessKeyID *dagger.Secret,
	// AWS Secret Access Key
	// +optional
	awsSecretAccessKey *dagger.Secret,
	// AWS Session Token
	// +optional
	awsSessionToken *dagger.Secret,
	// +optional
	// AWS Region
	awsRegion string,
	// +optional
	// AWS Account ID
	awsAccountId string,
	// +optional
	// +default=["docs", "widget"]
	// ECR Repository
	sites []string,
	// +optional
	// Image tag
	imageTag string,
) (string, error) {
	regCred, err := m.AWS().EcrGetLoginPassword(ctx, awsAccessKeyID, awsSecretAccessKey, awsSessionToken, awsRegion)
	if err != nil {
		return "", err
	}

	secret := dag.SetSecret("aws-reg-cred", regCred)
	ecrHost := fmt.Sprintf("%s.dkr.ecr.%s.amazonaws.com", awsAccountId, awsRegion)

	eg, ctx := errgroup.WithContext(ctx)

	var out string
	for _, r := range sites {
		r := r
		eg.Go(func() error {
			ecrWithRepo := fmt.Sprintf("%s/%s:%s", ecrHost, r, imageTag)
			out, _ = m.Server(r).WithRegistryAuth(ecrHost, "AWS", secret).Publish(ctx, ecrWithRepo)
			return nil
		})
	}

	if err := eg.Wait(); err != nil {
		return "", err
	}

	return out, nil
}

// AWS commands
func (m *Ci) AWS() *AWS {
	return &AWS{Ci: m}
}

// Publish sites to s3 bucket
func (m *Ci) Release(
	ctx context.Context,

	// AWS Access Key ID
	// +optional
	awsAccessKeyID *dagger.Secret,
	// AWS Secret Access Key
	// +optional
	awsSecretAccessKey *dagger.Secret,
	// AWS Session Token
	// +optional
	awsSessionToken *dagger.Secret,
	// +optional
	// AWS Region
	awsRegion string,
	// +optional
	// +default="docs"
	// Site to release
	site string,
	// Cloudfront distribution ID
	cloudfrontID string,
) error {
	ctr, err := m.AWS().AwsCli(ctx, awsAccessKeyID, awsSecretAccessKey, awsSessionToken, awsRegion)
	if err != nil {
		return err
	}

	dir, _ := m.Build()

	eg, ctx := errgroup.WithContext(ctx)

	eg.Go(func() error {
		_, err = ctr.WithDirectory("/app", dir.Directory(fmt.Sprintf("/%s", site))).
			WithExec([]string{"aws", "s3", "sync", "/app", fmt.Sprintf("s3://%s.kobiton.com", site)}).
			WithExec([]string{"aws", "cloudfront", "create-invalidation", "--distribution-id", cloudfrontID, "--paths", "/*"}).Stdout(ctx)
		return err
	})

	return eg.Wait()
}

