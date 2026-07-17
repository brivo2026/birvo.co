import { getPrismaClient, type PrismaClient } from '@birvo/database';

export const prisma: PrismaClient = getPrismaClient();
