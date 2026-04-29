import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryQueueAdapter } from '../queue/in-memory.adapter.js';
import type { JobHandler, QueuePort } from '../queue/queue.port.js';

describe('InMemoryQueueAdapter', () => {
  let queue: InMemoryQueueAdapter;

  beforeEach(() => {
    queue = new InMemoryQueueAdapter();
  });

  describe('publish', () => {
    it('should publish a job and return a job id', async () => {
      const jobId = await queue.publish('test-job', { key: 'value' });
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(jobId.length).toBeGreaterThan(0);
    });

    it('should return unique ids for each publish', async () => {
      const id1 = await queue.publish('test-job', { n: 1 });
      const id2 = await queue.publish('test-job', { n: 2 });
      expect(id1).not.toBe(id2);
    });

    it('should store published jobs', async () => {
      await queue.publish('email', { to: 'a@b.com' });
      const jobs = queue.getPendingJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.name).toBe('email');
      expect(jobs[0]?.data).toEqual({ to: 'a@b.com' });
    });

    it('should filter jobs by name', async () => {
      await queue.publish('email', { to: 'a@b.com' });
      await queue.publish('sms', { to: '123' });
      await queue.publish('email', { to: 'c@d.com' });

      const emailJobs = queue.getPendingJobsByName('email');
      expect(emailJobs).toHaveLength(2);

      const smsJobs = queue.getPendingJobsByName('sms');
      expect(smsJobs).toHaveLength(1);
    });

    it('should trigger matching handlers synchronously', async () => {
      const handled: unknown[] = [];
      await queue.subscribe<{ msg: string }>('notify', async (job) => {
        handled.push(job.data);
      });

      await queue.publish('notify', { msg: 'hello' });

      expect(handled).toHaveLength(1);
      expect(handled[0]).toEqual({ msg: 'hello' });
    });

    it('should not trigger handlers for different job names', async () => {
      const handled: unknown[] = [];
      await queue.subscribe<{ msg: string }>('notify', async (job) => {
        handled.push(job.data);
      });

      await queue.publish('other-job', { msg: 'should not trigger' });

      expect(handled).toHaveLength(0);
    });
  });

  describe('subscribe', () => {
    it('should register a handler for a job name', async () => {
      await queue.subscribe('test', async () => {});
      // If we publish, handler should fire
      let fired = false;
      await queue.subscribe('fire', async () => {
        fired = true;
      });
      await queue.publish('fire', {});
      expect(fired).toBe(true);
    });

    it('should allow multiple handlers for the same job name', async () => {
      const results: number[] = [];
      await queue.subscribe<{ n: number }>('multi', async (job) => {
        results.push(job.data.n * 2);
      });
      await queue.subscribe<{ n: number }>('multi', async (job) => {
        results.push(job.data.n * 3);
      });

      await queue.publish('multi', { n: 5 });

      expect(results).toContain(10);
      expect(results).toContain(15);
    });

    it('should pass the full job object to the handler', async () => {
      let receivedJob: unknown;

      await queue.subscribe<{ x: number }>('full', async (job) => {
        receivedJob = job;
      });

      const jobId = await queue.publish('full', { x: 42 });
      expect(receivedJob).toMatchObject({
        id: jobId,
        name: 'full',
        data: { x: 42 },
      });
    });
  });

  describe('unsubscribe', () => {
    it('should remove all handlers for a job name', async () => {
      let called = false;
      await queue.subscribe('removable', async () => {
        called = true;
      });

      await queue.unsubscribe('removable');
      await queue.publish('removable', {});

      expect(called).toBe(false);
    });

    it('should not affect handlers of other job names', async () => {
      let calledA = false;
      let calledB = false;

      await queue.subscribe('job-a', async () => {
        calledA = true;
      });
      await queue.subscribe('job-b', async () => {
        calledB = true;
      });

      await queue.unsubscribe('job-a');
      await queue.publish('job-a', {});
      await queue.publish('job-b', {});

      expect(calledA).toBe(false);
      expect(calledB).toBe(true);
    });

    it('should be safe to unsubscribe non-existent job names', async () => {
      await expect(queue.unsubscribe('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('close', () => {
    it('should clear all handlers and jobs', async () => {
      let called = false;
      await queue.subscribe('closing', async () => {
        called = true;
      });
      await queue.publish('closing', {});
      expect(called).toBe(true);

      called = false;
      await queue.close();
      await queue.publish('closing', {});

      expect(called).toBe(false);
      expect(queue.getPendingJobs()).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should remove all jobs and handlers', async () => {
      let called = false;
      await queue.subscribe('clear-me', async () => {
        called = true;
      });
      await queue.publish('clear-me', {});

      queue.clear();

      expect(queue.getPendingJobs()).toHaveLength(0);
      called = false;
      await queue.publish('clear-me', {});
      expect(called).toBe(false);
    });
  });

  describe('getPendingJobs', () => {
    it('should return empty array when no jobs', () => {
      expect(queue.getPendingJobs()).toEqual([]);
    });

    it('should return all jobs in order', async () => {
      await queue.publish('a', 1);
      await queue.publish('b', 2);
      await queue.publish('c', 3);

      const jobs = queue.getPendingJobs();
      expect(jobs).toHaveLength(3);
      expect(jobs[0]?.data).toBe(1);
      expect(jobs[1]?.data).toBe(2);
      expect(jobs[2]?.data).toBe(3);
    });
  });

  describe('QueuePort contract', () => {
    it('should satisfy QueuePort interface', () => {
      const q: QueuePort = queue;
      expect(q).toBeDefined();
      expect(typeof q.publish).toBe('function');
      expect(typeof q.subscribe).toBe('function');
      expect(typeof q.unsubscribe).toBe('function');
      expect(typeof q.close).toBe('function');
    });
  });
});
