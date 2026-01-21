# Phase 2: Testing Strategy

**Context:** This testing strategy supports Phase 2 implementation, which begins after Phase 1 is stable and publicly viewable.**Cross-Reference:** See `Phase_2_INDEX.md` for complete Phase 2 documentation overview. See `2_1_technical_implementation.md` for implementation details.

---
 Phase 1 establishes read-only preview guards, notifications toggle, type consolidation, and service role key security.

Phase 2 requires a comprehensive testing approach to ensure preview mode works safely and provides valuable feedback.

---

## 1. Test Organization

```
tests/
├── unit/
│   ├── services/
│   │   ├── draftService.test.ts
│   │   └── previewBlocker.test.ts
│   └── middleware/
│       └── previewGuard.test.ts
├── integration/
│   ├── flows/
│   │   ├── jobPostingFlow.test.ts
│   │   ├── applicationFlow.test.ts
│   └── messaging/
│       └── messageDraft.test.ts
├── e2e/
│   ├── previewMode.test.ts
│   └── blockedActions.test.ts
└── fixtures/
    ├── previewData.json
    └── draftScenarios.json
```

---

## 2. Unit Testing

### Test Draft Service

```typescript
// services/draftService.test.ts
describe('DraftService', () => {
  let service: DraftService;
  let mockDb: jest.Mocked<Database>;

  beforeEach(() => {
    process.env.PREVIEW_MODE = 'true';
    mockDb = createMockDb();
    service = new DraftService(mockDb);
  });

  afterEach(() => {
    delete process.env.PREVIEW_MODE;
  });

  describe('createDraft', () => {
    it('creates a draft with correct defaults', async () => {
      const result = await service.createDraft('job', { title: 'Test Job' });
      
      expect(result.status).toBe('draft');
      expect(result.is_preview).toBe(true);
      expect(result.submitted_at).toBeNull();
      expect(result.finalized_at).toBeNull();
    });

    it('stores draft_data separately from main fields', async () => {
      const result = await service.createDraft('job', { 
        title: 'Test Job',
        description: 'A test description'
      });
      
      expect(result.draft_data).toEqual({
        title: 'Test Job',
        description: 'A test description'
      });
    });

    it('generates unique draft IDs', async () => {
      const draft1 = await service.createDraft('job', {});
      const draft2 = await service.createDraft('job', {});
      
      expect(draft1.id).not.toBe(draft2.id);
    });
  });

  describe('updateDraft', () => {
    it('merges updates with existing draft_data', async () => {
      const draft = await service.createDraft('job', { title: 'Original' });
      const updated = await service.updateDraft(draft.id, { description: 'New' });
      
      expect(updated.draft_data).toEqual({
        title: 'Original',
        description: 'New'
      });
    });

    it('throws if draft does not exist', async () => {
      await expect(
        service.updateDraft('non-existent', {})
      ).rejects.toThrow('Draft not found');
    });

    it('prevents updates to finalized drafts', async () => {
      const draft = await service.createDraft('job', {});
      mockDb.findOne.mockResolvedValueOnce({ 
        ...draft, 
        finalized_at: new Date() 
      });
      
      await expect(
        service.updateDraft(draft.id, {})
      ).rejects.toThrow('Cannot update finalized draft');
    });
  });

  describe('dryRunSubmit', () => {
    it('validates draft without persisting', async () => {
      const draft = await service.createDraft('job', {
        title: 'Valid Job',
        description: 'A valid job posting'
      });
      
      const result = await service.dryRunSubmit(draft.id);
      
      expect(result.success).toBe(true);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('returns validation errors for invalid drafts', async () => {
      const draft = await service.createDraft('job', { title: '' });
      
      const result = await service.dryRunSubmit(draft.id);
      
      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain('Title is required');
    });

    it('logs dry run events', async () => {
      const logger = new PreviewLogger();
      const logSpy = jest.spyOn(logger, 'log');
      
      await service.dryRunSubmit('draft-id');
      
      expect(logSpy).toHaveBeenCalledWith(
        '[preview][dry_run] submit_request',
        expect.objectContaining({ id: 'draft-id' })
      );
    });

    it('does not write to production tables', async () => {
      await service.dryRunSubmit('draft-id');
      
      expect(mockDb.insert).not.toHaveBeenCalledWith('jobs', expect.anything());
    });
  });
});
```

### Test Preview Blocker

```typescript
// services/previewBlocker.test.ts
describe('PreviewBlocker', () => {
  let blocker: PreviewBlocker;
  let logger: jest.Mocked<PreviewLogger>;

  beforeEach(() => {
    process.env.PREVIEW_MODE = 'true';
    logger = createMockLogger();
    blocker = new PreviewBlocker(logger);
  });

  afterEach(() => {
    delete process.env.PREVIEW_MODE;
  });

  describe('shouldBlock', () => {
    it('blocks payment actions in preview mode', () => {
      expect(blocker.shouldBlock('payment_charge')).toBe(true);
      expect(blocker.shouldBlock('wallet_transfer')).toBe(true);
    });

    it('allows safe actions in preview mode', () => {
      expect(blocker.shouldBlock('draft_create')).toBe(false);
      expect(blocker.shouldBlock('profile_edit_name')).toBe(false);
    });

    it('allows all actions when preview mode is off', () => {
      process.env.PREVIEW_MODE = 'false';
      
      expect(blocker.shouldBlock('payment_charge')).toBe(false);
      expect(blocker.shouldBlock('wallet_transfer')).toBe(false);
    });
  });

  describe('block', () => {
    it('creates PreviewBlockedError with correct message', () => {
      const error = blocker.block('payment_charge', { amount: 100 });
      
      expect(error).toBeInstanceOf(PreviewBlockedError);
      expect(error.message).toContain('disabled in preview mode');
      expect(error.action).toBe('payment_charge');
      expect(error.isPreview).toBe(true);
    });
  });

  describe('execute', () => {
    it('executes function when action is allowed', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await blocker.execute('draft_create', fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('blocks and logs when action is not allowed', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Should not execute'));
      
      await expect(
        blocker.execute('payment_charge', fn)
      ).rejects.toThrow(PreviewBlockedError);
      
      expect(fn).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        '[preview][blocked]',
        expect.objectContaining({ action: 'payment_charge' })
      );
    });
  });
});
```

---

## 3. Integration Testing

### Test Job Posting Flow with Preview

```typescript
// integration/flows/jobPostingFlow.test.ts
describe('Job Posting Flow - Preview Mode', () => {
  let app: Express;
  let previewLogger: PreviewLogger;

  beforeAll(async () => {
    app = createTestApp({ previewMode: true });
    previewLogger = new PreviewLogger();
  });

  describe('Complete Flow', () => {
    it('allows user to create, edit, and preview-submit a job', async () => {
      const session = await loginUser(previewUser);
      
      // Step 1: Create draft
      const createResponse = await request(app)
        .post('/api/jobs')
        .set('Cookie', session.cookie)
        .send({
          title: 'Test Job',
          description: 'A test job description',
          budget: 500
        });
      
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.status).toBe('draft');
      expect(createResponse.body.is_preview).toBe(true);
      
      const jobId = createResponse.body.id;
      
      // Step 2: Update draft
      const updateResponse = await request(app)
        .patch(`/api/jobs/${jobId}`)
        .set('Cookie', session.cookie)
        .send({ budget: 750 });
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.budget).toBe(750);
      expect(updateResponse.body.status).toBe('draft');
      
      // Step 3: Dry run submit
      const submitResponse = await request(app)
        .post(`/api/jobs/${jobId}/submit`)
        .set('Cookie', session.cookie);
      
      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.success).toBe(true);
      expect(submitResponse.body.dry_run).toBe(true);
      
      // Verify job was not actually posted to production
      const prodJob = await db.findOne('jobs', { id: jobId });
      expect(prodJob).toBeNull();
      
      // Verify draft exists in preview state
      const draftJob = await db.findOne('jobs_preview', { id: jobId });
      expect(draftJob).not.toBeNull();
    });

    it('blocks actual job posting in preview mode', async () => {
      const session = await loginUser(previewUser);
      const jobId = await createDraftJob(session);
      
      // Try to force-finalize a job
      const response = await request(app)
        .post(`/api/jobs/${jobId}/finalize`)
        .set('Cookie', session.cookie);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('disabled in preview mode');
    });
  });

  describe('Validation Errors', () => {
    it('catches validation errors before submit', async () => {
      const session = await loginUser(previewUser);
      
      const response = await request(app)
        .post('/api/jobs')
        .set('Cookie', session.cookie)
        .send({
          title: '', // Invalid
          description: 'A job',
          budget: -100 // Invalid
        });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Title is required');
      expect(response.body.errors).toContain('Budget must be positive');
    });
  });
});
```

---

## 4. End-to-End Testing

### Test Blocked Actions with User Feedback

```typescript
// e2e/blockedActions.test.ts
describe('E2E: Blocked Actions', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
    await loginAsPreviewUser(page);
  });

  afterAll(async () => {
    await browser.close();
  });

  it('shows clear blocked action message when clicking finalize', async () => {
    await page.goto('/jobs/new');
    
    // Fill and submit form
    await page.fill('[name="title"]', 'Test Job');
    await page.fill('[name="description"]', 'Test Description');
    await page.fill('[name="budget"]', '500');
    
    await page.click('button[type="submit"]');
    
    // Should see preview submit button
    const previewButton = await page.$('[data-testid="preview-submit"]');
    expect(previewButton).not.toBeNull();
    
    await previewButton.click();
    
    // Should see blocked action banner
    const blockedBanner = await page.waitForSelector('[data-testid="preview-blocked-banner"]');
    const bannerText = await blockedBanner.textContent();
    
    expect(bannerText).toContain('Preview Mode');
    expect(bannerText).toContain('disabled');
  });

  it('allows trying the blocked action again after understanding', async () => {
    await page.goto('/wallet/transfer');
    
    const transferButton = await page.$('[data-testid="transfer-button"]');
    await transferButton.click();
    
    // Blocked message appears
    const blockedMessage = await page.textContent('[data-testid="preview-blocked-message"]');
    expect(blockedMessage).toContain('wallet transfers are disabled');
    
    // User can dismiss and continue exploring
    await page.click('[data-testid="dismiss-preview-message"]');
    
    // Page remains functional
    expect(await page.url()).toBe('/wallet/transfer');
  });
});
```

---

## 5. Fixtures and Test Data

### Preview Data Fixtures

```typescript
// fixtures/previewData.json
{
  "users": {
    "previewUser1": {
      "id": "preview-user-1",
      "email": "preview1@test.com",
      "name": "Preview User 1",
      "is_preview": true
    }
  },
  "jobs": {
    "draftJob": {
      "title": "Draft Job",
      "description": "A draft job for testing",
      "budget": 500,
      "status": "draft",
      "is_preview": true
    },
    "invalidDraftJob": {
      "title": "",
      "description": "Invalid job",
      "budget": -100,
      "status": "draft",
      "is_preview": true
    }
  },
  "applications": {
    "draftApplication": {
      "job_id": "job-1",
      "cover_letter": "I'm interested!",
      "status": "draft",
      "is_preview": true
    }
  }
}
```

### Draft Scenarios

```typescript
// fixtures/draftScenarios.json
{
  "scenarios": [
    {
      "name": "complete_job_flow",
      "description": "User creates, edits, and previews a job posting",
      "steps": [
        "navigate to /jobs/new",
        "fill job form with valid data",
        "save as draft",
        "edit draft budget",
        "preview submit",
        "verify blocked finalize",
        "see success message"
      ],
      "expected_events": [
        "[flow_start] job_posting",
        "[draft_create]",
        "[draft_update]",
        "[dry_run] submit_request",
        "[preview][blocked] finalize"
      ]
    },
    {
      "name": "invalid_job_submission",
      "description": "User tries to submit an invalid job",
      "steps": [
        "navigate to /jobs/new",
        "fill job form with invalid data",
        "attempt submit",
        "see validation errors"
      ],
      "expected_events": [
        "[flow_start] job_posting",
        "[preview][submit] error"
      ],
      "expected_errors": [
        "Title is required",
        "Budget must be positive"
      ]
    }
  ]
}
```

---

## 6. Test Coverage Goals

### Coverage Targets

| Component | Target Coverage | Critical Paths |
|-----------|-----------------|----------------|
| DraftService | 90%+ | create, update, dryRunSubmit |
| PreviewBlocker | 95%+ | shouldBlock, block, execute |
| PreviewGuard | 90%+ | middleware, flag checks |
| PreviewLogger | 80%+ | log, persistEvent |
| Flow endpoints | 85%+ | all draft-related endpoints |

### Critical Test Scenarios

1. **Draft lifecycle**: create → update → dry run → delete
2. **Blocked actions**: payment, wallet transfer, email send
3. **Preview indicators**: banner shows, actions clearly marked
4. **Data isolation**: drafts never touch production tables
5. **Feature flags**: toggles work correctly, default is block
6. **Analytics**: events logged correctly, metrics captured

---

## 7. Running Tests

### Unit Tests

```bash
# Run all unit tests
bun test tests/unit

# Run with coverage
bun test --coverage tests/unit

# Run specific file
bun test tests/unit/services/draftService.test.ts
```

### Integration Tests

```bash
# Run integration tests
bun test tests/integration

# With preview mode enabled
PREVIEW_MODE=true bun test tests/integration
```

### E2E Tests

```bash
# Run E2E tests
bun test tests/e2e

# Run specific E2E scenario
bun test tests/e2e/blockedActions.test.ts

# Run in CI mode (headless)
bun test tests/e2e --headless
```

---

## 8. Continuous Testing

### Pre-Commit Hook

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "bun test tests/unit --changed",
      "pre-push": "bun test tests/unit tests/integration --changed"
    }
  }
}
```

### CI Pipeline

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        preview-mode: [true, false]
    
    steps:
      - uses: actions/checkout@v3
      - run: bun install
      - run: bun test
        env:
          PREVIEW_MODE: ${{ matrix.preview-mode }}
```

---

## 9. Test Data Cleanup

### Cleanup Script

```typescript
// scripts/cleanupTestData.ts
async function cleanupPreviewData() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot run in production');
  }

  await db.delete('jobs', { is_preview: true });
  await db.delete('applications', { is_preview: true });
  await db.delete('messages', { is_preview: true });
  await db.delete('preview_events', {});
  
  console.log('Preview test data cleaned up');
}

cleanupPreviewData().catch(console.error);
```

### Schedule Cleanup

```bash
# Run cleanup daily at 2 AM
0 2 * * * cd /app && bun scripts/cleanupTestData.ts
```
