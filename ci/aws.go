package main

import (
	"context"
)

type AWS struct {
	Ci *Ci // +private
}

func (m *AWS) AwsCli(ctx context.Context, awsAccessKeyID, awsSecretAccessKey, awsSessionToken *Secret, awsRegion string) (*Container, error) {
	ctr := dag.Container().
		From("public.ecr.aws/aws-cli/aws-cli:latest").
		WithSecretVariable("AWS_ACCESS_KEY_ID", awsAccessKeyID).
		WithSecretVariable("AWS_SECRET_ACCESS_KEY", awsSecretAccessKey).
		WithSecretVariable("AWS_SESSION_TOKEN", awsSessionToken).
		WithEnvVariable("AWS_REGION", awsRegion)

	return ctr, nil
}

// example usage: "dagger call aws ecr-get-login-password --aws-region=ap-southeast-1 --aws-access-key-id=env:AWS_ACCESS_KEY_ID --aws-secret-access-key=env:AWS_SECRET_ACCESS_KEY --aws-session-token=env:AWS_SESSION_TOKEN"
func (m *AWS) EcrGetLoginPassword(
	ctx context.Context,

	// +optional
	awsAccessKeyID *Secret,
	// +optional
	awsSecretAccessKey *Secret,
	// +optional
	awsSessionToken *Secret,
	// +optional
	awsRegion string,
) (string, error) {
	ctr, err := m.AwsCli(ctx, awsAccessKeyID, awsSecretAccessKey, awsSessionToken, awsRegion)
	if err != nil {
		return "", err
	}

	return ctr.
		WithExec([]string{"--region", awsRegion, "ecr", "get-login-password"}).
		Stdout(ctx)
}
