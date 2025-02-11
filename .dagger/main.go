package main

import (
	"context"
	"dagger/ci/internal/dagger"
	"errors"
	"fmt"

	"golang.org/x/sync/errgroup"
)

type Ci struct {
	// +private
	Source *dagger.Directory
}

func New(
	// Project source directory.
	// +optional
	// +defaultPath="/"
	// +ignore=[".git", "**/node_modules"]
	source *dagger.Directory,

	// Checkout the repository (at the designated ref) and use it as the source directory instead of the local one.
	// +optional
	ref string,
) (*Ci, error) {
	if source == nil && ref != "" {
		source = dag.Git("https://github.com/kobiton/docs.git", dagger.GitOpts{
			KeepGitDir: true,
		}).Ref(ref).Tree()
	}

	if source == nil {
		return nil, errors.New("either source or ref is required")
	}

	return &Ci{
		Source: source,
	}, nil
}

const (
	nodeVersionMaintenance = "16"
	nodeVersionLTS         = "20"
)

// Build the project
func (m *Ci) Build() (*dagger.Directory, error) {
	var eg errgroup.Group

	var docs *dagger.Directory
	eg.Go(func() error {
		docs = m.nodeJsBase().
			WithExec([]string{"yarn", "build-docs"}).
			Directory("/app/build/docs")
		return nil
	})
	var widget *dagger.Directory
	eg.Go(func() error {
		widget = m.nodeJsBase().
			WithExec([]string{"yarn", "build-widget"}).
			Directory("/app/build/widget")
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
		WithoutEntrypoint().
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

func (m Ci) nodeJsBase() *dagger.Container {
	// Use the LTS version by default
	return m.nodeJsBaseFromVersion(nodeVersionLTS)
}

func (m Ci) nodeJsBaseFromVersion(nodeVersion string) *dagger.Container {
	appDir := "app"
	src := m.Source

	mountPath := fmt.Sprintf("/%s", appDir)

	nodeVersionImage := fmt.Sprintf("node:%s-alpine", nodeVersion)

	return dag.Container(dagger.ContainerOpts{Platform: "linux/amd64"}).
		// ⚠️  Keep this in sync with the engine version defined in package.json
		From(nodeVersionImage).
		WithoutEntrypoint().
		WithWorkdir(mountPath).
		WithMountedCache("/usr/local/share/.cache/yarn", dag.CacheVolume(fmt.Sprintf("yarn_cache:%s", nodeVersion))).
		WithMountedCache("/app/node_modules", dag.CacheVolume("node_modules_cache")).
		WithFile(fmt.Sprintf("%s/package.json", mountPath), src.File("package.json")).
		// WithFile(fmt.Sprintf("%s/yarn.lock", mountPath), src.File("yarn.lock")).
		WithExec([]string{"apk", "add", "bash"}).
		WithExec([]string{"apk", "add", "git"}).
		WithExec([]string{"apk", "add", "openssl"}).
		WithExec([]string{"git", "config", "--global", "user.email", "'kobiton@kobiton.com'"}).
		WithExec([]string{"git", "config", "--global", "user.name", "'Kobiton'"}).
		WithExec([]string{"git", "init", "."}).
		WithExec([]string{"git", "commit", "--allow-empty", "-m", "init"}).
		WithExec([]string{"yarn", "install"}).
		WithDirectory(mountPath, src)
}
