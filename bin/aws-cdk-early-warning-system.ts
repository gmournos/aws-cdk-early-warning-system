#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsCdkEarlyWarningSystemStack } from '../lib/aws-cdk-early-warning-system-stack';

const app = new cdk.App();
new AwsCdkEarlyWarningSystemStack(app, 'AwsCdkEarlyWarningSystemStack', {});