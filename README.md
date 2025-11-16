# 🎯 Scheme Application Portal - Production Setup

**Production-ready infrastructure for Rajasthan with auto-scaling and CI/CD pipelines**

---

## 📊 Quick Overview

```
✅ Region               : India (ap-south-1, Mumbai)
✅ Scalability          : Auto-scales 1-4 tasks (100-10,000 req/day)
✅ Production Ready     : Multi-AZ database, health checks, monitoring
✅ Deployment Duration  : 2 months max, then cleanup
✅ CI/CD Pipeline       : GitHub Actions (Build & Deploy)
✅ Monthly Cost         : ~$100-120 (scales with traffic)
✅ High Availability    : Automatic RDS failover
✅ Auto-Scaling        : Triggers at 70% CPU, scales 1-4 tasks
```

---

## 📁 Files Created

### Infrastructure
```
📄 cloudformation-template.yaml
   • VPC with public/private subnets (2 AZs)
   • Application Load Balancer
   • ECS Fargate cluster with auto-scaling
   • RDS PostgreSQL Multi-AZ database
   • CloudWatch logs and monitoring
   • Auto-scaling policies (1-4 tasks)
```

### CI/CD Pipelines
```
📄 .github/workflows/build.yml
   • Triggers on: push, pull_request
   • Steps: Test → Build → Push to ECR
   
📄 .github/workflows/deploy.yml
   • Triggers on: push to main
   • Steps: Update ECS → Wait → Verify
```

### Application
```
📄 Dockerfile
   • Multi-stage build
   • Node.js 18 Alpine
   • Health check included
   
📄 src/app/api/health/route.ts
   • ALB health check endpoint
```

### Documentation
```
📄 DEPLOYMENT_GUIDE.md
   • Quick start (6 steps)
   • Architecture & scaling
   • Operations & monitoring
   
📄 GITHUB_ACTIONS_SETUP.md
   • Secure OIDC setup
   • IAM role configuration
```

---

## 🚀 Quick Start (15 minutes)

### 1. Create ECR Repository
```powershell
aws ecr create-repository --repository-name scheme-app --region ap-south-1
```

### 2. Setup GitHub Actions
Follow `GITHUB_ACTIONS_SETUP.md` to create IAM role and add `AWS_ROLE_TO_ASSUME` secret.

### 3. Deploy Infrastructure
```powershell
aws cloudformation create-stack `
  --stack-name scheme-app-production `
  --template-body file://cloudformation-template.yaml `
  --parameters `
    ParameterKey=DockerImageUri,ParameterValue=YOUR_ECR_IMAGE `
    ParameterKey=DatabasePassword,ParameterValue=YourPassword123 `
  --region ap-south-1 `
  --capabilities CAPABILITY_NAMED_IAM
```

### 4. Deploy Application
```powershell
git push origin main  # Automatic build & deploy via GitHub Actions
```

### 5. Verify
```powershell
$alb = aws cloudformation describe-stacks --stack-name scheme-app-production `
  --query 'Stacks[0].Outputs[0].OutputValue' --output text
curl "http://$alb/api/health"
```

---

## 📈 Architecture

```
Users → ALB → ECS Tasks (1-4 auto-scaled) → RDS Multi-AZ PostgreSQL
```

**Auto-scaling:** 
- 1 task @ <50% CPU
- 2 tasks @ 50-70% CPU  
- 3 tasks @ 70-85% CPU
- 4 tasks @ >85% CPU

---

## 💰 Estimated Costs

| Component | Monthly |
|-----------|---------|
| ALB | ~$16 |
| ECS (avg 2-3 tasks) | ~$50 |
| RDS Multi-AZ | ~$40 |
| Logs & Monitoring | ~$3 |
| **Total** | **~$109/month** |

For 2-month campaign: ~$220

---

## 🔒 Security Features

✅ VPC isolation (database in private subnets)  
✅ RDS encryption at rest  
✅ Non-root container user  
✅ OIDC for GitHub Actions (no AWS keys)  
✅ Least privilege IAM roles  
✅ Health checks with auto-restart

---

## 📝 Common Operations

```powershell
# View application logs
aws logs tail /ecs/scheme-app --follow

# Scale manually
aws ecs update-service --cluster scheme-app-cluster --service scheme-app-service --desired-count 3

# Deploy new version
aws ecs update-service --cluster scheme-app-cluster --service scheme-app-service --force-new-deployment

# Cleanup after 2 months
aws cloudformation delete-stack --stack-name scheme-app-production --region ap-south-1
```

---

## 📚 Documentation

- **DEPLOYMENT_GUIDE.md** - Complete setup instructions, architecture, operations
- **GITHUB_ACTIONS_SETUP.md** - IAM and OIDC configuration for secure GitHub Actions

---

## ✅ Pre-Deployment Checklist

- [ ] AWS account configured
- [ ] AWS CLI installed
- [ ] Docker installed
- [ ] ECR repository created
- [ ] IAM role created (GITHUB_ACTIONS_SETUP.md)
- [ ] `AWS_ROLE_TO_ASSUME` secret added to GitHub
- [ ] Database password ready

---

## 🎯 Next Steps

1. Read `DEPLOYMENT_GUIDE.md` (Quick Start section)
2. Complete `GITHUB_ACTIONS_SETUP.md`
3. Deploy CloudFormation stack
4. Push code to main branch
5. Monitor with CloudWatch
6. Cleanup after 2 months

---

**🚀 Start with DEPLOYMENT_GUIDE.md!**

*Production infrastructure for Rajasthan | 2-month campaigns | 100-10,000 req/day | Auto-scaling*
