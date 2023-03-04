import { Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';

export class IssuesAppCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPCを定義
    const vpc = new ec2.Vpc(this, 'IssuesLiveVPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.1.0.0/16'),
      maxAzs: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ],
    });

    // VPCゲートウェイエンドポイント追加
    vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [
        { subnetType: ec2.SubnetType.PUBLIC },
      ],
    });

    // AMIを設定
    const amazonLinux2 = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: ec2.AmazonLinuxCpuType.X86_64,
    });

    // EC2インスタンス用のセキュリティグループを設定
    const webSecurityGroup = new ec2.SecurityGroup(this, 'IssuesLiveWebSg', {
      vpc,
      allowAllOutbound: true,
    });
    webSecurityGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(80), 'Allow inbound HTTP');
    webSecurityGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(443), 'Allow inbound HTTPS');
    webSecurityGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(22), 'Allow inbound SSH');

    // EC2のIAMロール
    const webServerRole = new iam.Role(this, 'IssuesLiveWebRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
      ],
    });

    // EC2インスタンスの定義
    const webServer = new ec2.Instance(this, 'IssuesLiveWeb', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: webSecurityGroup,
      role: webServerRole,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: amazonLinux2
    });

    // EC2インスタンスにユーザーデータ追加
    // const userDataScript = readFileSync('./lib/resources/user-data.sh', 'utf8');
    // webServer.addUserData(userDataScript);

    // S3バケット
    const bucket = new s3.Bucket(this, 'IssuesLiveBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      bucketName: 'issues-app-production',
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
          allowedOrigins: [
            'http://localhost:*',
            'http://127.0.0.1:*',
            `http://${webServer.instancePublicIp}`,
            `https://${webServer.instancePublicIp}`,
          ],
          maxAge: 3,
        }
      ],
    });
  }
}
