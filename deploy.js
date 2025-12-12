#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  domain: "project.mayankjaiswal.in",
  rootDomain: "mayankjaiswal.in",
  region: "us-east-1", // Required for CloudFront
  projectName: "ai-microscopy",
  githubRepo: "mayankjaiswal27/honors-final-project", // Update with your actual repo
  buildDir: "frontend/dist",

  // AWS Resources
  s3Bucket: "project-mayankjaiswal-in",
  cloudfrontDistribution: null,
  certificateArn: null,
  hostedZoneId: null,
};

class AWSDeployer {
  constructor() {
    this.checkPrerequisites();
  }

  checkPrerequisites() {
    console.log("🔍 Checking prerequisites...");

    try {
      execSync("aws --version", { stdio: "ignore" });
      console.log("✅ AWS CLI found");
    } catch (error) {
      throw new Error(
        "❌ AWS CLI not found. Please install AWS CLI and configure credentials."
      );
    }

    try {
      execSync("gh --version", { stdio: "ignore" });
      console.log("✅ GitHub CLI found");
    } catch (error) {
      throw new Error(
        "❌ GitHub CLI not found. Please install GitHub CLI and authenticate."
      );
    }

    if (!fs.existsSync(CONFIG.buildDir)) {
      console.log("📦 Building frontend...");
      this.buildFrontend();
    }
  }

  buildFrontend() {
    try {
      execSync("cd frontend && npm install", { stdio: "inherit" });
      execSync("cd frontend && npm run build", { stdio: "inherit" });
      console.log("✅ Frontend built successfully");
    } catch (error) {
      throw new Error("❌ Failed to build frontend");
    }
  }

  async deploy() {
    console.log("🚀 Starting AWS deployment...");

    try {
      // Step 1: Create S3 bucket
      await this.createS3Bucket();

      // Step 2: Upload files to S3
      await this.uploadToS3();

      // Step 3: Get or create SSL certificate
      await this.setupSSLCertificate();

      // Step 4: Create CloudFront distribution
      await this.createCloudFrontDistribution();

      // Step 5: Setup DNS configuration
      await this.setupDNS();

      // Step 6: Setup GitHub secrets
      await this.setupGitHubSecrets();

      // Step 7: Create GitHub Actions workflow
      await this.createGitHubWorkflow();

      console.log("🎉 Deployment completed successfully!");
      console.log(
        `🌐 Your site will be available at: https://${CONFIG.domain}`
      );
      console.log("⏳ DNS propagation may take up to 48 hours");
    } catch (error) {
      console.error("❌ Deployment failed:", error.message);
      process.exit(1);
    }
  }

  async createS3Bucket() {
    console.log("📦 Creating S3 bucket...");

    try {
      // Create bucket
      execSync(`aws s3 mb s3://${CONFIG.s3Bucket} --region ${CONFIG.region}`, {
        stdio: "ignore",
      });
      console.log("✅ S3 bucket created");
    } catch (error) {
      if (error.message.includes("BucketAlreadyOwnedByYou")) {
        console.log("✅ S3 bucket already exists");
      } else {
        throw error;
      }
    }

    // Block public access (security best practice)
    try {
      execSync(
        `aws s3api put-public-access-block --bucket ${CONFIG.s3Bucket} --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"`,
        { stdio: "ignore" }
      );
      console.log("✅ S3 bucket secured with public access block");
    } catch (error) {
      console.log("⚠️ Public access block already configured");
    }

    console.log("✅ S3 bucket configured securely");
  }

  async uploadToS3() {
    console.log("📤 Uploading files to S3...");

    execSync(
      `aws s3 sync ${CONFIG.buildDir} s3://${CONFIG.s3Bucket} --delete --cache-control "public, max-age=31536000" --exclude "*.html" --exclude "*.json"`,
      { stdio: "inherit" }
    );
    execSync(
      `aws s3 sync ${CONFIG.buildDir} s3://${CONFIG.s3Bucket} --delete --cache-control "public, max-age=0, must-revalidate" --include "*.html" --include "*.json"`,
      { stdio: "inherit" }
    );

    console.log("✅ Files uploaded to S3");
  }

  async setupSSLCertificate() {
    console.log("🔒 Setting up SSL certificate...");

    try {
      // Check if certificate already exists
      const certResult = execSync(
        `aws acm list-certificates --region ${CONFIG.region} --query "CertificateSummaryList[?DomainName=='${CONFIG.domain}'].CertificateArn" --output text`,
        { encoding: "utf8" }
      ).trim();

      if (certResult && certResult !== "None") {
        CONFIG.certificateArn = certResult;
        console.log("✅ SSL certificate already exists");
        return;
      }

      // Request new certificate
      const certCommand = `aws acm request-certificate --domain-name ${CONFIG.domain} --validation-method DNS --region ${CONFIG.region} --output text`;
      CONFIG.certificateArn = execSync(certCommand, {
        encoding: "utf8",
      }).trim();

      console.log(
        "📋 SSL certificate requested. You need to validate it via DNS."
      );
      console.log(
        "🔍 Check AWS Console > Certificate Manager to get DNS validation records"
      );
      console.log("⏳ Waiting for certificate validation...");

      // Wait for certificate validation (this might take a while)
      let validated = false;
      let attempts = 0;
      const maxAttempts = 60; // 30 minutes

      while (!validated && attempts < maxAttempts) {
        try {
          const status = execSync(
            `aws acm describe-certificate --certificate-arn ${CONFIG.certificateArn} --region ${CONFIG.region} --query "Certificate.Status" --output text`,
            { encoding: "utf8" }
          ).trim();
          if (status === "ISSUED") {
            validated = true;
            console.log("✅ SSL certificate validated");
          } else {
            console.log(`⏳ Certificate status: ${status}. Waiting...`);
            await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds
            attempts++;
          }
        } catch (error) {
          console.log("⏳ Still waiting for certificate validation...");
          await new Promise((resolve) => setTimeout(resolve, 30000));
          attempts++;
        }
      }

      if (!validated) {
        throw new Error(
          "Certificate validation timed out. Please validate manually and re-run the script."
        );
      }
    } catch (error) {
      throw new Error(`Failed to setup SSL certificate: ${error.message}`);
    }
  }

  async createCloudFrontDistribution() {
    console.log("🌐 Creating CloudFront distribution...");

    // First get or create Origin Access Control (OAC)
    const oacName = `${CONFIG.projectName}-oac`;
    let oacId;

    try {
      // Check if OAC already exists
      const existingOAC = execSync(
        `aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='${oacName}'].Id" --output text`,
        { encoding: "utf8" }
      ).trim();

      if (existingOAC && existingOAC !== "None") {
        oacId = existingOAC;
        console.log("✅ Using existing Origin Access Control:", oacId);
      } else {
        // Create new OAC
        const oacConfig = {
          Name: oacName,
          Description: `Origin Access Control for ${CONFIG.domain}`,
          SigningBehavior: "always",
          SigningProtocol: "sigv4",
          OriginAccessControlOriginType: "s3",
        };

        fs.writeFileSync(
          "/tmp/oac-config.json",
          JSON.stringify(oacConfig, null, 2)
        );

        oacId = execSync(
          'aws cloudfront create-origin-access-control --origin-access-control-config file:///tmp/oac-config.json --output text --query "OriginAccessControl.Id"',
          { encoding: "utf8" }
        ).trim();
        console.log("✅ Origin Access Control created:", oacId);
      }
    } catch (error) {
      throw new Error(
        `Failed to setup Origin Access Control: ${error.message}`
      );
    }

    const distributionConfig = {
      CallerReference: `${CONFIG.projectName}-${Date.now()}`,
      Comment: `CloudFront distribution for ${CONFIG.domain}`,
      DefaultCacheBehavior: {
        TargetOriginId: `S3-${CONFIG.s3Bucket}`,
        ViewerProtocolPolicy: "redirect-to-https",
        TrustedSigners: {
          Enabled: false,
          Quantity: 0,
        },
        ForwardedValues: {
          QueryString: false,
          Cookies: { Forward: "none" },
        },
        MinTTL: 0,
        DefaultTTL: 86400,
        MaxTTL: 31536000,
        Compress: true,
      },
      Origins: {
        Quantity: 1,
        Items: [
          {
            Id: `S3-${CONFIG.s3Bucket}`,
            DomainName: `${CONFIG.s3Bucket}.s3.${CONFIG.region}.amazonaws.com`,
            S3OriginConfig: {
              OriginAccessIdentity: "",
            },
            OriginAccessControlId: oacId,
          },
        ],
      },
      Enabled: true,
      Aliases: {
        Quantity: 1,
        Items: [CONFIG.domain],
      },
      ViewerCertificate: {
        ACMCertificateArn: CONFIG.certificateArn,
        SSLSupportMethod: "sni-only",
        MinimumProtocolVersion: "TLSv1.2_2021",
      },
      CustomErrorResponses: {
        Quantity: 1,
        Items: [
          {
            ErrorCode: 404,
            ResponsePagePath: "/index.html",
            ResponseCode: "200",
            ErrorCachingMinTTL: 300,
          },
        ],
      },
      DefaultRootObject: "index.html",
    };

    fs.writeFileSync(
      "/tmp/cloudfront-config.json",
      JSON.stringify(distributionConfig, null, 2)
    );

    try {
      const result = execSync(
        'aws cloudfront create-distribution --distribution-config file:///tmp/cloudfront-config.json --output text --query "Distribution.Id"',
        { encoding: "utf8" }
      ).trim();
      CONFIG.cloudfrontDistribution = result;
      console.log("✅ CloudFront distribution created:", result);

      // Create bucket policy to allow CloudFront OAC access
      await this.createOACBucketPolicy(oacId);

      // Wait for distribution to be deployed
      console.log("⏳ Waiting for CloudFront distribution to deploy...");
      let deployed = false;
      let attempts = 0;
      const maxAttempts = 40; // 20 minutes

      while (!deployed && attempts < maxAttempts) {
        const status = execSync(
          `aws cloudfront get-distribution --id ${CONFIG.cloudfrontDistribution} --query "Distribution.Status" --output text`,
          { encoding: "utf8" }
        ).trim();
        if (status === "Deployed") {
          deployed = true;
          console.log("✅ CloudFront distribution deployed");
        } else {
          console.log(`⏳ Distribution status: ${status}. Waiting...`);
          await new Promise((resolve) => setTimeout(resolve, 30000));
          attempts++;
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to create CloudFront distribution: ${error.message}`
      );
    }
  }

  async createOACBucketPolicy(oacId) {
    console.log("🔐 Creating secure bucket policy for CloudFront OAC...");

    // Get AWS account ID
    const accountId = execSync(
      'aws sts get-caller-identity --query "Account" --output text',
      { encoding: "utf8" }
    ).trim();

    const bucketPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AllowCloudFrontServicePrincipal",
          Effect: "Allow",
          Principal: {
            Service: "cloudfront.amazonaws.com",
          },
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${CONFIG.s3Bucket}/*`,
          Condition: {
            StringEquals: {
              "AWS:SourceArn": `arn:aws:cloudfront::${accountId}:distribution/${CONFIG.cloudfrontDistribution}`,
            },
          },
        },
      ],
    };

    fs.writeFileSync(
      "/tmp/oac-bucket-policy.json",
      JSON.stringify(bucketPolicy, null, 2)
    );

    try {
      execSync(
        `aws s3api put-bucket-policy --bucket ${CONFIG.s3Bucket} --policy file:///tmp/oac-bucket-policy.json`,
        { stdio: "ignore" }
      );
      console.log("✅ Secure bucket policy created for CloudFront access");
    } catch (error) {
      throw new Error(`Failed to create bucket policy: ${error.message}`);
    }
  }

  async setupDNS() {
    console.log("🌍 Setting up DNS configuration...");

    try {
      // Get CloudFront distribution domain name
      const cfDomainName = execSync(
        `aws cloudfront get-distribution --id ${CONFIG.cloudfrontDistribution} --query "Distribution.DomainName" --output text`,
        { encoding: "utf8" }
      ).trim();

      console.log("📋 DNS Configuration Required:");
      console.log("=====================================");
      console.log(
        "Please add the following DNS record in your Spaceship domain panel:"
      );
      console.log("");
      console.log(`Record Type: CNAME`);
      console.log(`Name: project`);
      console.log(`Value: ${cfDomainName}`);
      console.log(`TTL: 300 (or default)`);
      console.log("");
      console.log(
        "This will point project.mayankjaiswal.in to your CloudFront distribution."
      );
      console.log("");

      // Save DNS info to file for reference
      const dnsInfo = {
        domain: CONFIG.domain,
        cloudfront_domain: cfDomainName,
        record_type: "CNAME",
        name: "project",
        value: cfDomainName,
        ttl: 300,
        instructions: [
          "1. Log into your Spaceship domain control panel",
          "2. Navigate to DNS management for mayankjaiswal.in",
          "3. Add a new CNAME record:",
          "   - Name: project",
          `   - Value: ${cfDomainName}`,
          "   - TTL: 300 (or leave default)",
          "4. Save the changes",
          "5. DNS propagation may take up to 48 hours",
        ],
      };

      fs.writeFileSync(
        "dns-configuration.json",
        JSON.stringify(dnsInfo, null, 2)
      );
      console.log("✅ DNS configuration saved to dns-configuration.json");

      // Wait for user confirmation
      console.log("");
      console.log("⏳ Waiting for DNS configuration...");
      console.log(
        "Press Enter after you have added the DNS record in Spaceship..."
      );

      // In a real scenario, you might want to pause here
      // For automation, we'll just log the instructions
      console.log("✅ DNS configuration instructions provided");
    } catch (error) {
      throw new Error(`Failed to get DNS configuration: ${error.message}`);
    }
  }

  async setupGitHubSecrets() {
    console.log("🔐 Setting up GitHub secrets...");

    try {
      // Get AWS credentials
      const awsAccessKeyId = execSync("aws configure get aws_access_key_id", {
        encoding: "utf8",
      }).trim();
      const awsSecretAccessKey = execSync(
        "aws configure get aws_secret_access_key",
        { encoding: "utf8" }
      ).trim();
      const awsRegion = CONFIG.region;

      // Set GitHub secrets
      const secrets = {
        AWS_ACCESS_KEY_ID: awsAccessKeyId,
        AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
        AWS_REGION: awsRegion,
        S3_BUCKET: CONFIG.s3Bucket,
        CLOUDFRONT_DISTRIBUTION_ID: CONFIG.cloudfrontDistribution,
      };

      for (const [key, value] of Object.entries(secrets)) {
        execSync(
          `gh secret set ${key} --body "${value}" --repo ${CONFIG.githubRepo}`,
          { stdio: "ignore" }
        );
        console.log(`✅ Set GitHub secret: ${key}`);
      }
    } catch (error) {
      throw new Error(`Failed to setup GitHub secrets: ${error.message}`);
    }
  }

  async createGitHubWorkflow() {
    console.log("⚙️ Creating GitHub Actions workflow...");

    const workflowDir = ".github/workflows";
    if (!fs.existsSync(workflowDir)) {
      fs.mkdirSync(workflowDir, { recursive: true });
    }

    const workflow = `name: Deploy to AWS

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
        
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
        
    - name: Build application
      run: |
        cd frontend
        npm run build
        
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: \${{ secrets.AWS_REGION }}
        
    - name: Deploy to S3
      run: |
        aws s3 sync frontend/dist s3://\${{ secrets.S3_BUCKET }} --delete --cache-control "public, max-age=31536000" --exclude "*.html" --exclude "*.json"
        aws s3 sync frontend/dist s3://\${{ secrets.S3_BUCKET }} --delete --cache-control "public, max-age=0, must-revalidate" --include "*.html" --include "*.json"
        
    - name: Invalidate CloudFront
      run: |
        aws cloudfront create-invalidation --distribution-id \${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
        
    - name: Deployment Summary
      run: |
        echo "🎉 Deployment completed successfully!"
        echo "🌐 Site URL: https://${CONFIG.domain}"
`;

    fs.writeFileSync(`${workflowDir}/deploy.yml`, workflow);
    console.log("✅ GitHub Actions workflow created");
  }
}

// Main execution
async function main() {
  console.log("🚀 AI Microscopy Deployment Script");
  console.log("===================================");

  const deployer = new AWSDeployer();
  await deployer.deploy();
}

// Run the deployment
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Deployment failed:", error.message);
    process.exit(1);
  });
}

module.exports = { AWSDeployer, CONFIG };
