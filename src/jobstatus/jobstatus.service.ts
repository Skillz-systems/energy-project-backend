// job-status.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface JobStatus {
  id: string;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  data?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class JobStatusService {
  constructor(
    @InjectQueue('device-processing') private readonly deviceQueue: Queue,
  ) {}

  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    const job = await this.deviceQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress || 0;

    return {
      id: job.id!.toString(),
      status: state as any,
      progress: typeof progress === 'number' ? progress : 0,
      data: state === 'completed' ? job.returnvalue : undefined,
      error: job.failedReason,
      createdAt: new Date(job.timestamp),
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
    };
  }

  async getJobResult(jobId: string) {
    const job = await this.deviceQueue.getJob(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    const state = await job.getState();

    if (state === 'completed') {
      return job.returnvalue;
    } else if (state === 'failed') {
      throw new Error(job.failedReason || 'Job failed');
    } else {
      throw new Error('Job not completed yet');
    }
  }
}
