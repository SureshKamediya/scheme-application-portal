# 🚀 Scheme App - Production Deployment Guide

**Region: ap-south-1 (Mumbai) | Duration: 2 months | Scalable: 1-4 tasks**

---

## 📋 Quick Start

### 1. Prerequisites
```powershell
# Install AWS CLI v2
# Install Docker
# Install Node.js 18+
# Have AWS account with credentials

# Configure AWS
aws configure set region ap-south-1
```

### 2. Create ECR Repository
```powershell
# Create ECR repository for Docker images
aws ecr create-repository `
  --repository-name scheme-app `
  --region ap-south-1

# Get login command
aws ecr get-login-password --region ap-south-1 | `
  docker login --username AWS --password-stdin `
  123456789.dkr.ecr.ap-south-1.amazonaws.com
```

### 3. Setup GitHub Secrets
```
Go to GitHub Repo → Settings → Secrets → New repository secret

Add:
- AWS_ROLE_TO_ASSUME: arn:aws:iam::ACCOUNT_ID:role/github-actions-role
  (See setup-github-actions.md for IAM setup)
```

### 4. Deploy Infrastructure (CloudFormation)
```powershell
# Set database password
$dbPassword = "YourSecurePassword123"  # Min 8 characters

# Get Docker image URI
$dockerImageUri = "123456789.dkr.ecr.ap-south-1.amazonaws.com/scheme-app:latest"

# Deploy CloudFormation stack
aws cloudformation create-stack `
  --stack-name scheme-app-production `
  --template-body file://cloudformation-template.yaml `
  --parameters `
    ParameterKey=AppName,ParameterValue=scheme-app `
    ParameterKey=EnvironmentName,ParameterValue=production `
    ParameterKey=DockerImageUri,ParameterValue=$dockerImageUri `
    ParameterKey=DesiredTaskCount,ParameterValue=2 `
    ParameterKey=DatabasePassword,ParameterValue=$dbPassword `
  --region ap-south-1 `
  --capabilities CAPABILITY_NAMED_IAM

# Wait for stack creation (10-15 minutes)
aws cloudformation wait stack-create-complete `
  --stack-name scheme-app-production `
  --region ap-south-1

# Get outputs
aws cloudformation describe-stacks `
  --stack-name scheme-app-production `
  --region ap-south-1 `
  --query 'Stacks[0].Outputs' `
  --output table
```

### 5. Push Initial Docker Image
```powershell
# Build and push
docker build -t scheme-app:latest .
docker tag scheme-app:latest 123456789.dkr.ecr.ap-south-1.amazonaws.com/scheme-app:latest
docker push 123456789.dkr.ecr.ap-south-1.amazonaws.com/scheme-app:latest

# Update ECS service to use the image
aws ecs update-service `
  --cluster scheme-app-cluster `
  --service scheme-app-service `
  --force-new-deployment `
  --region ap-south-1

# Wait for deployment
aws ecs wait services-stable `
  --cluster scheme-app-cluster `
  --services scheme-app-service `
  --region ap-south-1
```

### 6. Verify Deployment
```powershell
# Get ALB DNS
$albDns = aws cloudformation describe-stacks `
  --stack-name scheme-app-production `
  --region ap-south-1 `
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' `
  --output text

Write-Host "Application URL: http://$albDns"

# Test health endpoint
curl "http://$albDns/api/health"
# Should return: {"status":"ok","timestamp":"2025-..."}
```

---

## 📊 Architecture

```
                    Users (100-10,000/day)
                             │
                             ▼
              Application Load Balancer (ALB)
                    ap-south-1a/1b
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
           ECS Task      ECS Task      ECS Task
          (Fargate)     (Fargate)     (Fargate)
         (Scaling)      (Scaling)     (Scaling)
           1-4 tasks, Auto-scales based on traffic
                │            │            │
                └────────────┼────────────┘
                             │
                             ▼
              RDS PostgreSQL (Multi-AZ)
              Primary: ap-south-1a
              Standby: ap-south-1b
              (Automatic failover)
```

---

## 🔄 CI/CD Pipeline

### Build Pipeline (`build.yml`)
Triggers on: `push` to main/develop, `pull_request`

**Steps:**
1. Checkout code
2. Setup Node.js 18
3. Install dependencies
4. Run tests
5. Build application
6. Login to ECR
7. Build and push Docker image
8. Tag as `latest` if on main branch

**Image locations:**
- Commit SHA: `123456789.dkr.ecr.ap-south-1.amazonaws.com/scheme-app:abc123...`
- Latest: `123456789.dkr.ecr.ap-south-1.amazonaws.com/scheme-app:latest`

### Deploy Pipeline (`deploy.yml`)
Triggers on: `push` to main, `workflow_dispatch` (manual)

**Steps:**
1. Checkout code
2. Configure AWS credentials
3. Update ECS service with new image
4. Wait for deployment to complete
5. Verify service is stable

---

## 📈 Scaling Behavior

```
CPU Utilization:
   100% ┌────────────┐
        │            │
    80% │  ╱╲╱╲╱╲╱╲  │ ← Auto-scales up when > 70%
        │ ╱          ╲ │    Auto-scales down when < 70%
    50% │╱            ╲│
        │              └───
     0% └────────────────────
        0  10  20  30  40  50 minutes

Tasks Running:
     4 ┌────────────┐
       │            │
     3 │  ┌──────┐  │ ← Scales: 1-4 tasks
       │  │      │  │    Min: 1 (cost saving)
     2 │  │      │  │    Max: 4 (handles 10,000 req/day)
       │  │      │  │
     1 │─ ┴──────┴──┴─
       │
       └────────────────────
```

---

## 💰 Monthly Costs (Estimate)

```
Component                  Cost/Month
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALB                        ~$16
ECS Fargate (2-3 tasks)    ~$40-60
RDS db.t3.small Multi-AZ   ~$40
CloudWatch Logs            ~$3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL                      ~$99-119/month

For 2 months: ~$200-240
```

---

## 🔧 Operations

### Check Application Status
```powershell
# Get ECS service details
aws ecs describe-services `
  --cluster scheme-app-cluster `
  --services scheme-app-service `
  --region ap-south-1

# Get running tasks
aws ecs list-tasks `
  --cluster scheme-app-cluster `
  --region ap-south-1

# View logs
aws logs tail /ecs/scheme-app --follow --region ap-south-1
```

### Manual Scaling
```powershell
# Scale to 3 tasks
aws ecs update-service `
  --cluster scheme-app-cluster `
  --service scheme-app-service `
  --desired-count 3 `
  --region ap-south-1
```

### Deploy New Version
```powershell
# Option 1: Push to main branch (automatic via pipeline)
git push origin main
# GitHub Actions will build, push, and deploy automatically

# Option 2: Manual deployment
aws ecs update-service `
  --cluster scheme-app-cluster `
  --service scheme-app-service `
  --force-new-deployment `
  --region ap-south-1
```

### View Database
```powershell
# Get database endpoint
$dbEndpoint = aws rds describe-db-instances `
  --db-instance-identifier scheme-db `
  --region ap-south-1 `
  --query 'DBInstances[0].Endpoint.Address' `
  --output text

Write-Host "Database: $dbEndpoint"

# Connect using psql
psql -h $dbEndpoint -U admin -d schemedb
```

---

## 🗑️ Cleanup After Campaign (2 Months)

```powershell
# Delete CloudFormation stack (deletes all resources)
aws cloudformation delete-stack `
  --stack-name scheme-app-production `
  --region ap-south-1

# Wait for deletion
aws cloudformation wait stack-delete-complete `
  --stack-name scheme-app-production `
  --region ap-south-1

# Delete ECR repository (optional - keep for next campaign)
aws ecr delete-repository `
  --repository-name scheme-app `
  --force `
  --region ap-south-1

# After cleanup: No more AWS costs ✅
```

---

## ⚠️ Important Points

### Auto-Scaling
- Automatically scales between 1-4 tasks
- Scales up when CPU > 70%
- Scales down after 5 minutes of low CPU
- Handles 100-10,000 requests/day easily

### Database
- Multi-AZ with automatic failover
- 7-day backups (included in cost)
- 20GB initial storage
- Encrypted at rest

### Health Checks
- ALB checks health every 30 seconds
- Tasks have 60-second startup grace period
- Failed tasks are automatically replaced
- Logs sent to CloudWatch

### Monitoring
- View logs: AWS CloudWatch Logs console
- View metrics: AWS CloudWatch metrics
- View costs: AWS Billing dashboard
- Set alerts in CloudWatch

---

## 🔒 Security

- ✅ VPC isolation (private database subnet)
- ✅ Security groups with least privilege
- ✅ Database encryption (AES-256)
- ✅ Non-root container user
- ✅ Health checks for application
- ✅ Automated backups

---

## 📝 Next Steps

1. **Complete prerequisite setup** (AWS CLI, Docker, credentials)
2. **Create ECR repository** for Docker images
3. **Setup GitHub secrets** for AWS access
4. **Deploy CloudFormation stack** to create infrastructure
5. **Build and push initial Docker image** to ECR
6. **Update ECS service** with the image
7. **Verify application is running** via health check
8. **Monitor with CloudWatch** during campaign
9. **Cleanup stack** after 2 months to remove costs

---

## 📞 Troubleshooting

### ECS Tasks Not Starting
```powershell
# Check task logs
aws logs tail /ecs/scheme-app --follow

# Describe failed tasks
aws ecs describe-tasks --cluster scheme-app-cluster --tasks <TASK_ARN>
```

### Database Connection Failed
```powershell
# Check security group allows ECS to RDS
aws ec2 describe-security-groups --region ap-south-1

# Verify RDS is running
aws rds describe-db-instances --db-instance-identifier scheme-db
```

### ALB Not Routing Traffic
```powershell
# Check target group health
aws elbv2 describe-target-health --target-group-arn <TG_ARN>
```

---

**Ready to deploy? Start with step 1 in "Quick Start" above!** 🚀
