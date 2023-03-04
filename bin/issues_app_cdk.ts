#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { IssuesAppCdkStack } from '../lib/issues_app_cdk-stack';

const app = new cdk.App();
new IssuesAppCdkStack(app, 'IssuesAppCdkStack');
