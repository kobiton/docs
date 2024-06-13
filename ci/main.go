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
	Source *Directory
}

func New(
	// Project source directory.
	// +optional
	source *Directory,

	// Checkout the repository (at the designated ref) and use it as the source directory instead of the local one.
	// +optional
	ref string,
) (*Ci, error) {
	if source == nil && ref != "" {
		source = dag.Git("https://github.com/kobiton/docs.git", GitOpts{
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
func (m *Ci) Build() (*Directory, error) {
	var eg errgroup.Group

	var docs *Directory
	eg.Go(func() error {
		docs = m.nodeJsBase().
			WithExec([]string{"yarn", "build-docs"}).
			Directory("/app/build/docs")
		return nil
	})
	var widget *Directory
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
) *Container {
	dir, _ := m.Build()

	path := fmt.Sprintf("/%s", site)

	return dag.Container(dagger.ContainerOpts{Platform: "linux/amd64"}).
		From("nginx:alpine").
		WithoutEntrypoint().
		WithWorkdir(path).
		WithDirectory(path, dir.Directory(fmt.Sprintf("%s", site))).
		WithFile(fmt.Sprintf("/%s/replace-env-vars.sh", site), m.Source.File("scripts/replace-env-vars.sh")).
		WithFile("/etc/nginx/nginx.conf", m.Source.File(fmt.Sprintf("docker/%s/nginx.conf", site))).
		WithFile("/etc/nginx/mime.types", m.Source.File("docker/mime.types")).
		WithFile(fmt.Sprintf("/%s/_/js/vendor/mermaid.min.js", site), m.Source.File("assets/js/mermaid.min.js")).
		WithExec([]string{"apk", "add", "--no-cache", "bash"}).
		WithDefaultArgs([]string{"sh", "-c", fmt.Sprintf("/bin/bash /%s/replace-env-vars.sh /%s && nginx -g 'daemon off;'", site, site)}).
		WithExposedPort(80)
}

func (m *Ci) ServerDocs() *Service {
	return m.Server("docs").
		WithExec([]string{"sh", "-c", "/bin/bash /docs/replace-env-vars.sh /docs && nginx -g 'daemon off;'"}).
		AsService()
}

// Publish image to ECR repo
func (m *Ci) Publish(
	ctx context.Context,

	// AWS Access Key ID
	// +optional
	awsAccessKeyID *Secret,
	// AWS Secret Access Key
	// +optional
	awsSecretAccessKey *Secret,
	// AWS Session Token
	// +optional
	awsSessionToken *Secret,
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
	awsAccessKeyID *Secret,
	// AWS Secret Access Key
	// +optional
	awsSecretAccessKey *Secret,
	// AWS Session Token
	// +optional
	awsSessionToken *Secret,
	// +optional
	// AWS Region
	awsRegion string,
	// +optional
	// +default=["docs", "widget"]
	// Sites to release
	sites []string,
	// Cloudfront distribution ID
	cloudfrontDistributionID []string,
) error {
	ctr, err := m.AWS().AwsCli(ctx, awsAccessKeyID, awsSecretAccessKey, awsSessionToken, awsRegion)
	if err != nil {
		return err
	}

	listSites := make(map[string]string)

	for i := range sites {
		listSites[sites[i]] = cloudfrontDistributionID[i]
	}

	dir, _ := m.Build()

	eg, ctx := errgroup.WithContext(ctx)

	for site, cf := range listSites {
		eg.Go(func() error {
			_, err = ctr.WithDirectory("/app", dir.Directory(fmt.Sprintf("/%s", site))).
				WithExec([]string{"s3", "sync", "/app", fmt.Sprintf("s3://%s.kobiton.com", site)}).
				WithExec([]string{"cloudfront", "create-invalidation", "--distribution-id", cf, "--paths", "/*"}).Stdout(ctx)
			return err
		})
	}

	return eg.Wait()
}

func (m Ci) nodeJsBase() *Container {
	// Use the LTS version by default
	return m.nodeJsBaseFromVersion(nodeVersionLTS)
}

func (m Ci) nodeJsBaseFromVersion(nodeVersion string) *Container {
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
		WithFile(fmt.Sprintf("%s/package.json", mountPath), src.File("package.json")).
		//WithFile(fmt.Sprintf("%s/yarn.lock", mountPath), src.File("yarn.lock")).
		WithExec([]string{"apk", "add", "bash"}).
		WithExec([]string{"apk", "add", "git"}).
		WithExec([]string{"apk", "add", "openssl"}).
		WithExec([]string{"yarn", "install"}).
		WithDirectory(mountPath, src)
}
