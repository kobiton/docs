# CI

This dagger module is used to define the CI for the docs, widget sites.

> [!NOTE]
>
> You need to install dagger to use this module. https://docs.dagger.io/install

### Build the docs, widget sites

Build the docs and widget sites using the following command.
```bash
dagger call --source=.:default build export --path=./build
```

### Run the docs site locally

Run the docs site locally using the following command.
```bash
dagger call --source=.:default server-docs up --ports=8080:80
```

### Build docker image and push to ECR repo
```bash
dagger call --source=. publish \
    --sites="docs" \
    --aws-region=ap-southeast-1 \
    --aws-access-key-id=env:AWS_ACCESS_KEY_ID \
    --aws-secret-access-key=env:AWS_SECRET_ACCESS_KEY \
    --aws-session-token=env:AWS_SESSION_TOKEN \
    --aws-account-id=$AWS_ACCOUNT_ID \
    --image-tag="<commit>"
```

> [!NOTE]
> 
> You need to set the environment variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_ACCOUNT_ID` before running the above command.

### Deploy the docs site to S3

Build the docs site and deploy to S3. This is for CI deployment.
```bash
dagger call --source=. release \
    --sites="docs" \
    --aws-region=<region s3 bucket> \
    --aws-access-key-id=env:AWS_ACCESS_KEY_ID \
    --aws-secret-access-key=env:AWS_SECRET_ACCESS_KEY \
    --aws-session-token=env:AWS_SESSION_TOKEN \
    --cloudfrontDistributionID="<cloudfront-id>"
```
