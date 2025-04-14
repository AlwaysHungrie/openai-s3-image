brew install awscli
aws --version

https://us-east-1.console.aws.amazon.com/iam/home?region=ap-south-1#/users/create
follow wizard with warnings
AdministratorAccess

https://us-east-1.console.aws.amazon.com/iam/home?region=ap-south-1#/users
select user
security credentials > access keys

aws configure
enter access key, secret, ap-south-1, json

aws s3 ls