pipeline {
  options {
    disableConcurrentBuilds()
  }

  agent {
    label "nodejs-app-slave-3"
  }

  parameters {
    string(name: 'COMMIT_ID', defaultValue: '', description: "The git commit id to indicate the codebase for building. By default it's the environment GIT_COMMIT from Jenkins.")
    booleanParam(name: 'BUILD', defaultValue: true, description: "Build and publish Docker image to AWS ECR.")
    booleanParam(name: 'CI_TO_KOBITON_TEST', defaultValue: true, description: 'Deploy to Kobiton Test environment')
    // booleanParam(name: 'CI_TO_KOBITON_STAGING', defaultValue: false, description: 'Deploy to Kobiton Staging environment')
    // booleanParam(name: "CI_TO_KOBITON_PRODUCTION", defaultValue: false, description: "Deploy an existing build to Kobiton Production environment")
    booleanParam(name: "APPLY_K8S_VIRTUAL_SERVICE_MANIFEST", defaultValue: true, description: "apply K8s Virtual Service manifest, which will affect traffic switching")
    string(name: 'DEPLOY_REPO_CODEBASE_ID', defaultValue: '', description: 'Either the remote branch ("origin/<branch name>"),  git commit id ("aaec22") or git tag (release-v3.6.0) of the env repo that is used to deploy the app. By default it is "origin/master"')

  }

  environment {
    CI_DEPLOY_APP_NAME = "documentation"
    CI_DOCKER_IMAGE_NAME = "documentation"
    REPO_NAME = "kobiton/documentation"
  }

  stages {
    stage('Set CI variables') {

      steps {
        script {
          GIT_COMMIT_ID=sh(script: "[ -z $params.COMMIT_ID ] && echo ${env.GIT_COMMIT.take(6)} || git rev-parse --short=6 $params.COMMIT_ID", returnStdout: true).trim()
        }
      }
    }
    stage('Pull docker-ci tool') {

      steps {
        script {
          // login to AWS ECR
          sh('eval $(aws ecr get-login --no-include-email --region ap-southeast-1)')

          sh("docker pull 580359070243.dkr.ecr.ap-southeast-1.amazonaws.com/docker-ci:latest")

          // Alias it to call below statement
          sh("docker tag 580359070243.dkr.ecr.ap-southeast-1.amazonaws.com/docker-ci:latest docker-ci:latest")
        }
      }
    }

    stage('Build and publish to AWS ECR') {

      steps {
        script {
          sh("docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                docker-ci:latest \
                  --git-url $env.GIT_URL \
                  --commit-id $GIT_COMMIT_ID \
                  build --docker --docker-centralized --docker-image-name portal-help \
                  --docker-image-tag $GIT_COMMIT_ID")
          sh("docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                docker-ci:latest \
                  --git-url $env.GIT_URL \
                  --commit-id $GIT_COMMIT_ID \
                  build --docker --docker-centralized --docker-image-name documentation \
                  --docker-image-tag $GIT_COMMIT_ID")
          sh("docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                docker-ci:latest archive --docker-registry \
                --docker-image-name portal-help \
                --docker-image-tag $GIT_COMMIT_ID")
          sh("docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                docker-ci:latest archive --docker-registry \
                --docker-image-name documentation \
                --docker-image-tag $GIT_COMMIT_ID")
        }
      }
    }

    stage("Deploy to Kobiton Test") {
      when {
        expression {
          // Allow to skip deploy the branch master to Test server in case manual
          return !env.BRANCH_NAME.startsWith("PR-") && params.CI_TO_KOBITON_TEST
        }
      }

      steps {
        script {
          sh("docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            docker-ci:latest deploy \
            --env-name kobiton-test --app-name documentation \
            ${params.APPLY_K8S_VIRTUAL_SERVICE_MANIFEST? "--extra-k8s-apply-virtual-service" : ''} \
            ${params.DEPLOY_REPO_CODEBASE_ID ? "--env-codebase-id $params.DEPLOY_REPO_CODEBASE_ID" : ''} \
            --docker-image-tag $GIT_COMMIT_ID")
        }
      }
    }
  }

  post {
    failure {
      script {
        sh("docker run --rm \
              docker-ci:latest notify \
              --failure \
              --job-param-name COMMIT_ID --job-param-value ${GIT_COMMIT_ID} \
              --job-param-name CI_TO_KOBITON_TEST --job-param-value ${params.CI_TO_KOBITON_TEST} \
              --job-param-name CI_TO_KOBITON_STAGING --job-param-value ${params.CI_TO_KOBITON_STAGING} \
              --job-param-name CI_TO_KOBITON_PRODUCTION --job-param-value ${params.CI_TO_KOBITON_PRODUCTION} \
              --job-param-name CI_TO_ML_INTEGRATION --job-param-value ${params.CI_TO_ML_INTEGRATION} \
              --job-param-name APPLY_K8S_VIRTUAL_SERVICE_MANIFEST --job-param-value ${params.APPLY_K8S_VIRTUAL_SERVICE_MANIFEST} \
              ${params.DEPLOY_REPO_CODEBASE_ID ? "--job-param-name DEPLOY_REPO_CODEBASE_ID --job-param-value $params.DEPLOY_REPO_CODEBASE_ID": ''} \
              --ci-job-url ${env.BUILD_URL} \
              --ci-job-id ${env.BUILD_ID} \
              --git-repo-name $env.REPO_NAME")
      }
    }

    success {
      script {
        sh("docker run --rm \
              docker-ci:latest notify \
              --job-param-name BUILD --job-param-value ${params.BUILD} \
              --job-param-name COMMIT_ID --job-param-value ${GIT_COMMIT_ID} \
              --job-param-name CI_TO_KOBITON_TEST --job-param-value ${params.CI_TO_KOBITON_TEST} \
              --job-param-name CI_TO_KOBITON_STAGING --job-param-value ${params.CI_TO_KOBITON_STAGING} \
              --job-param-name CI_TO_KOBITON_PRODUCTION --job-param-value ${params.CI_TO_KOBITON_PRODUCTION} \
              --job-param-name CI_TO_ML_INTEGRATION --job-param-value ${params.CI_TO_ML_INTEGRATION} \
              --job-param-name APPLY_K8S_VIRTUAL_SERVICE_MANIFEST --job-param-value ${params.APPLY_K8S_VIRTUAL_SERVICE_MANIFEST} \
              ${params.DEPLOY_REPO_CODEBASE_ID ? "--job-param-name DEPLOY_REPO_CODEBASE_ID --job-param-value $params.DEPLOY_REPO_CODEBASE_ID": ''} \
              --ci-job-url ${env.BUILD_URL} \
              --ci-job-id ${env.BUILD_ID} \
              --git-repo-name $env.REPO_NAME")
      }
    }
  }
}