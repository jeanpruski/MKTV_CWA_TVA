import dotenv from 'dotenv';
import serverless from 'serverless-http';
import { createApp } from './app';

dotenv.config();

export const handler = serverless(createApp());
