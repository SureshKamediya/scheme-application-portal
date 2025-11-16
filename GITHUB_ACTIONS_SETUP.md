# GitHub Actions AWS IAM Setup

**Setup GitHub Actions to deploy to AWS (OIDC Trust)**

---

## ✅ One-Time Setup (5 minutes)

### Step 1: Create IAM Role for GitHub Actions

```powershell
# Create trust policy (save as trust-policy.json)
$trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:SureshKamediya/scheme-application-portal:ref:refs/heads/main"
        }
      }
    }
  ]
}
"@

# Replace YOUR_ACCOUNT_ID with your AWS account ID
$trustPolicy | Out-File trust-policy.json

# Create the role
aws iam create-role `
  --role-name github-actions-role `
  --assume-role-policy-document file://trust-policy.json `
  --region ap-south-1

Write-Host "Role created: github-actions-role"
```

### Step 2: Add Permissions to Role

```powershell
# Create inline policy (save as policy.json)
$policy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:ap-south-1:*:repository/scheme-app"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:DescribeClusters"
      ],
      "Resource": "*"
    }
  ]
}
"@

$policy | Out-File policy.json

# Add inline policy
aws iam put-role-policy `
  --role-name github-actions-role `
  --policy-name github-actions-policy `
  --policy-document file://policy.json

Write-Host "Permissions added"

# Get role ARN
$roleArn = aws iam get-role --role-name github-actions-role --query 'Role.Arn' --output text
Write-Host "Role ARN: $roleArn"
```

### Step 3: Add GitHub Secret

```
Go to GitHub: scheme-application-portal → Settings → Secrets → New repository secret

Name: AWS_ROLE_TO_ASSUME
Value: arn:aws:iam::ACCOUNT_ID:role/github-actions-role
```

---

## 🔄 How It Works

```
1. Developer pushes to main branch
   │
   ├─ GitHub Actions triggered
   │  │
   │  ├─ Checkout code
   │  │
   │  ├─ Request OIDC token from GitHub
   │  │
   │  ├─ Exchange OIDC token for AWS credentials
   │  │
   │  ├─ Assume github-actions-role
   │  │
   │  ├─ Build & push Docker image to ECR
   │  │
   │  ├─ Update ECS service
   │  │
   │  └─ Deploy ✅
   │
   └─ Application updates automatically
```

---

## ✨ No AWS Access Keys Needed!

This OIDC method is **secure** because:
- ✅ No long-lived AWS access keys stored in GitHub
- ✅ Tokens are short-lived (valid only for ~5 minutes)
- ✅ Each request gets fresh token from GitHub
- ✅ Reduces risk of compromised credentials
- ✅ AWS automatically validates GitHub token

---

## 📝 Trust Policy Explanation

```json
{
  "Principal": {
    "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
  }
  // ↑ Trust tokens from GitHub Actions
  
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:sub": "repo:SureshKamediya/scheme-application-portal:ref:refs/heads/main"
    }
  }
  // ↑ Only allow from THIS repository and MAIN branch
}
```

---

## 🔐 Permissions Explanation

| Permission | Used For |
|-----------|----------|
| `ecr:GetAuthorizationToken` | Login to ECR |
| `ecr:PutImage` | Push Docker image |
| `ecr:InitiateLayerUpload` | Upload image layers |
| `ecs:UpdateService` | Update ECS service with new image |
| `ecs:DescribeServices` | Check deployment status |

---

## ✅ Verify Setup

```powershell
# List created role
aws iam list-roles --query "Roles[?RoleName=='github-actions-role']" --output table

# List inline policies
aws iam list-role-policies --role-name github-actions-role

# View trust policy
aws iam get-role --role-name github-actions-role --query 'Role.AssumeRolePolicyDocument'

# View inline policy
aws iam get-role-policy `
  --role-name github-actions-role `
  --policy-name github-actions-policy
```

---

## 🧹 Cleanup (Optional)

```powershell
# If you need to delete the role later
aws iam delete-role-policy `
  --role-name github-actions-role `
  --policy-name github-actions-policy

aws iam delete-role --role-name github-actions-role
```

---

**Now your GitHub Actions can deploy to AWS securely! ✅**
