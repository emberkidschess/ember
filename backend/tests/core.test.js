const { generateCSV } = require("../dist/utils/export");
const { zonedDateTimeToUtc, localCalendarDateAsUtc, classAccessWindow } = require("../dist/utils/dateTime");
const { addMinutesToTime, buildRecurringClassDates, formatRecurringSchedule } = require("../dist/services/batchSchedulingService");
const { BaseAuthService } = require("../dist/services/baseAuthService");
const { requireAnyPermission } = require("../dist/middleware/auth");
const { validateCSRFToken } = require("../dist/middleware/csrf");
const { corsHandler } = require("../dist/middleware/cors");
const {
  createPackageSchema,
  createPublicLeadSchema,
  createPaymentLinkSchema,
  markPaymentReceivedSchema,
  scheduleTrialClassSchema,
  markTrialResultSchema,
  createBatchSchema,
  createExtraClassSchema,
} = require("../dist/utils/validation");
const {
  COURSE_SESSION_TOTALS,
  createBatchSessionPlan,
  getAllowedSessionPlans,
  validateSessionPlan,
} = require("../dist/domain/courseEnrollment");
const {
  cosineSimilarity,
  isAcademyRelated,
  normalizeEmbedding,
  prepareKnowledgeChunks,
  splitKnowledgeText,
} = require("../dist/services/knowledgeBaseService");

describe("academy RAG utilities", () => {
  test("chunks long website content into bounded, overlapping passages", () => {
    const text = Array.from(
      { length: 40 },
      (_, index) => `Section ${index + 1} explains an academy course, class, or policy in a complete sentence.`
    ).join(" ");
    const chunks = splitKnowledgeText(text, 420, 60);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 420)).toBe(true);
    expect(chunks.every((chunk) => chunk.length > 0)).toBe(true);
  });

  test("creates stable source-specific chunks ready for embedding", () => {
    const document = {
      sourceId: "website:test",
      category: "courses",
      title: "Beginner course",
      url: "/courses",
      text: "Beginner students learn piece movement, chess rules, and basic checkmates.",
    };
    const first = prepareKnowledgeChunks([document]);
    const second = prepareKnowledgeChunks([document]);

    expect(first).toHaveLength(1);
    expect(first[0].sourceId).toBe("website:test:chunk:1");
    expect(first[0].contentHash).toBe(second[0].contentHash);
  });

  test("normalizes embeddings for cosine retrieval", () => {
    const vector = normalizeEmbedding([3, 4]);
    expect(vector[0]).toBeCloseTo(0.6);
    expect(vector[1]).toBeCloseTo(0.8);
    expect(cosineSimilarity(vector, vector)).toBeCloseTo(1);
  });

  test("keeps the assistant academy-only while allowing relevant follow-ups", () => {
    const weakResult = [{ score: 0.12 }];
    expect(isAcademyRelated("What are the current fees?", weakResult)).toBe(true);
    expect(isAcademyRelated("How can my child learn chess online?", weakResult)).toBe(true);
    expect(isAcademyRelated("Write a movie review", weakResult)).toBe(false);
    expect(isAcademyRelated("Tell me more about Manish", [{ score: 0.78 }])).toBe(true);
  });
});

describe("critical domain utilities", () => {
  test("CSV export neutralizes spreadsheet formulas and preserves quoting", () => {
    const csv = generateCSV(
      [{ name: "=HYPERLINK(\"https://evil.example\")", note: "safe, quoted" }],
      ["name", "note"]
    );
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"safe, quoted"');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  test("timezone conversion handles non-whole-hour offsets", () => {
    expect(
      zonedDateTimeToUtc("2026-01-15", "10:00", "Asia/Kolkata").toISOString()
    ).toBe("2026-01-15T04:30:00.000Z");
    expect(
      localCalendarDateAsUtc("America/Los_Angeles", new Date("2026-07-04T02:00:00.000Z")).toISOString()
    ).toBe("2026-07-03T00:00:00.000Z");
  });

  test("recurring schedules keep selected weekdays and minute-precise times", () => {
    const dates = buildRecurringClassDates("2026-07-13", [1, 5], 6).map((date) => date.toISOString().slice(0, 10));
    expect(dates).toEqual(["2026-07-13", "2026-07-17", "2026-07-20", "2026-07-24", "2026-07-27", "2026-07-31"]);
    expect(addMinutesToTime("17:30", 90)).toBe("19:00");
    expect(formatRecurringSchedule([1, 5], "17:30", "Asia/Kolkata")).toBe("Every Monday & Friday · 5:30 PM · Asia/Kolkata");
  });

  test("access windows open early and duration can cross midnight safely", () => {
    const window = classAccessWindow({
      date: "2026-07-20",
      startTime: "23:30",
      endTime: addMinutesToTime("23:30", 90),
      timezone: "Asia/Kolkata",
      accessOpensMinutesBefore: 5,
    });
    expect(window.startAt.getTime() - window.opensAt.getTime()).toBe(5 * 60 * 1000);
    expect(window.closesAt.getTime() - window.startAt.getTime()).toBe(90 * 60 * 1000);
  });

  test("automated batch and extra-class contracts require complete scheduling data", () => {
    const automatedBatch = {
      name: "Evening Batch", courseLevel: "Beginner", coach: "507f1f77bcf86cd799439012",
      frequencyDays: [1, 5], classStartTime: "17:30", classDurationMinutes: 90,
      accessOpensMinutesBefore: 10, timezone: "Asia/Kolkata", startDate: "2026-07-20",
      meetingLink: "https://meet.example.com/evening",
      whatsappCommunityLink: "https://chat.whatsapp.com/example",
    };
    expect(createBatchSchema.safeParse(automatedBatch).success).toBe(true);
    expect(createBatchSchema.safeParse({ ...automatedBatch, frequencyDays: [] }).success).toBe(false);
    expect(createBatchSchema.safeParse({ ...automatedBatch, meetingLink: "" }).success).toBe(false);
    expect(createBatchSchema.safeParse({ ...automatedBatch, classStartTime: "17:05" }).success).toBe(true);
    expect(createExtraClassSchema.safeParse({
      date: "2026-07-21", startTime: "10:05", timezone: "Asia/Kolkata",
      durationMinutes: 120, meetingLink: "https://meet.example.com/revision", reason: "Revision",
    }).success).toBe(true);
  });

  test("payment-link input contracts keep payment method system-controlled", () => {
    const validLink = {
      purpose: "new_package",
      lead: "507f1f77bcf86cd799439011",
      amount: 1200,
      currency: "INR",
    };

    expect(createPaymentLinkSchema.safeParse(validLink).success).toBe(true);
    expect(createPaymentLinkSchema.safeParse({ ...validLink, paymentMethod: "legacy" }).success).toBe(true);
    expect(markPaymentReceivedSchema.safeParse({ reference: "WISE-123" }).success).toBe(true);
  });

  test("public lead and payment-link input contracts reject incomplete data", () => {
    expect(
      createPublicLeadSchema.safeParse({
        studentName: "Student",
        parentName: "Parent",
        phoneNumber: "+15555555555",
        email: "parent@example.com",
      }).success
    ).toBe(false);

    expect(
      createPaymentLinkSchema.safeParse({
        purpose: "new_package",
        lead: "507f1f77bcf86cd799439011",
        amount: -1,
        currency: "INR",
      }).success
    ).toBe(false);
  });

  test("course totals and generated batch sessions stay fixed", () => {
    expect(COURSE_SESSION_TOTALS).toEqual({
      Beginner: 30,
      Intermediate: 60,
      Advanced: 60,
      Expert: 30,
    });
    const expertSessions = createBatchSessionPlan("Expert");
    expect(expertSessions).toHaveLength(30);
    expect(expertSessions[0]).toEqual({ sessionNumber: 1, status: "planned" });
    expect(expertSessions[29]).toEqual({ sessionNumber: 30, status: "planned" });
  });

  test("session plans are restricted by course level", () => {
    expect(getAllowedSessionPlans("Beginner")).toEqual([10, 30]);
    expect(getAllowedSessionPlans("Intermediate")).toEqual([10, 30, 60]);
    expect(() => validateSessionPlan("Beginner", "60 Sessions")).toThrow();
    expect(validateSessionPlan("Advanced", "60 Sessions").sessions).toBe(60);

    expect(
      createPackageSchema.safeParse({
        student: "507f1f77bcf86cd799439011",
        courseLevel: "Expert",
        packageType: "20 Classes Package",
      }).success
    ).toBe(false);
  });

  test("trial validation requires safe meeting links and supports nuanced results", () => {
    const baseTrial = {
      leadId: "507f1f77bcf86cd799439011",
      coach: "507f1f77bcf86cd799439012",
      date: "2026-07-10",
      startTime: "10:00",
      endTime: "10:45",
      timezone: "Asia/Kolkata",
    };

    expect(scheduleTrialClassSchema.safeParse({ ...baseTrial, meetingLink: "https://meet.example.com/class" }).success).toBe(true);
    expect(scheduleTrialClassSchema.safeParse({ ...baseTrial, meetingLink: "ftp://meet.example.com/class" }).success).toBe(false);
    expect(markTrialResultSchema.safeParse({ trialResult: "needs_follow_up" }).success).toBe(true);
    expect(markTrialResultSchema.safeParse({ trialResult: "reschedule_requested" }).success).toBe(true);
    expect(markTrialResultSchema.safeParse({ trialResult: "maybe" }).success).toBe(false);
  });
});

describe("JWT key separation", () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = "admin-access-secret-32-characters-minimum";
    process.env.JWT_REFRESH_SECRET = "admin-refresh-secret-32-characters-min";
    process.env.JWT_CLIENT_ACCESS_SECRET = "client-access-secret-32-characters-min";
    process.env.JWT_CLIENT_REFRESH_SECRET = "client-refresh-secret-32-characters";
  });

  test("verifies each token with the key selected by its signed account type", () => {
    BaseAuthService.validateSecrets();
    const token = BaseAuthService.generateAccessToken({
      authId: "507f1f77bcf86cd799439011",
      profileId: "507f1f77bcf86cd799439012",
      authType: "client",
      sessionVersion: 1,
    });
    expect(BaseAuthService.verifyAccessToken(token).authType).toBe("client");

    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    payload.authType = "admin";
    const forged = `${parts[0]}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${parts[2]}`;
    expect(() => BaseAuthService.verifyAccessToken(forged)).toThrow();
  });

  test("generates a unique identifier for every refresh token rotation", () => {
    const payload = {
      authId: "507f1f77bcf86cd799439011",
      profileId: "507f1f77bcf86cd799439012",
      authType: "client",
      sessionVersion: 1,
    };
    const first = BaseAuthService.generateRefreshToken(payload);
    const second = BaseAuthService.generateRefreshToken(payload);

    expect(first).not.toBe(second);
    expect(BaseAuthService.verifyRefreshToken(first, "client").jti).toBeTruthy();
    expect(BaseAuthService.verifyRefreshToken(second, "client").jti).toBeTruthy();
  });

  test("rejects reused JWT secrets", () => {
    const original = process.env.JWT_CLIENT_REFRESH_SECRET;
    process.env.JWT_CLIENT_REFRESH_SECRET = process.env.JWT_ACCESS_SECRET;
    expect(() => BaseAuthService.validateSecrets()).toThrow(/different/);
    process.env.JWT_CLIENT_REFRESH_SECRET = original;
  });
});

describe("RBAC permission middleware", () => {
  function mockResponse() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  }

  test("allows admins and staff with at least one matching permission", () => {
    const next = jest.fn();
    const middleware = requireAnyPermission("view_payment_history", "generate_payment_link");

    middleware({ user: { permissions: ["*"] } }, mockResponse(), next);
    expect(next).toHaveBeenCalledTimes(1);

    middleware({ user: { permissions: ["generate_payment_link"] } }, mockResponse(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test("rejects staff without any matching permission", () => {
    const next = jest.fn();
    const res = mockResponse();

    requireAnyPermission("view_students", "create_report_card")(
      { user: { permissions: ["view_leads"] } },
      res,
      next
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});

describe("browser request boundary", () => {
  function mockResponse() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    res.header = jest.fn(() => res);
    res.sendStatus = jest.fn(() => res);
    return res;
  }

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://academy.example";
  });

  test("applies CSRF origin validation to every scoped portal cookie", () => {
    for (const cookieName of [
      "adminAccessToken",
      "adminRefreshToken",
      "staffAccessToken",
      "staffRefreshToken",
      "clientAccessToken",
      "clientRefreshToken",
      "refreshToken",
    ]) {
      const next = jest.fn();
      const res = mockResponse();
      validateCSRFToken(
        {
          method: "POST",
          headers: { origin: "https://evil.example" },
          cookies: { [cookieName]: "signed-token" },
        },
        res,
        next
      );
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    }
  });

  test("allows a configured origin and advertises the portal selector header", () => {
    const next = jest.fn();
    const csrfRes = mockResponse();
    validateCSRFToken(
      {
        method: "POST",
        headers: { origin: "https://academy.example" },
        cookies: { clientAccessToken: "signed-token" },
      },
      csrfRes,
      next
    );
    expect(next).toHaveBeenCalledTimes(1);

    const corsRes = mockResponse();
    corsHandler(
      { method: "OPTIONS", headers: { origin: "https://academy.example" } },
      corsRes,
      jest.fn()
    );
    expect(corsRes.header).toHaveBeenCalledWith(
      "Access-Control-Allow-Headers",
      expect.stringContaining("X-Auth-Portal")
    );
    expect(corsRes.sendStatus).toHaveBeenCalledWith(204);
  });

  test("rejects a disallowed origin before a mutation can execute", () => {
    const next = jest.fn();
    const res = mockResponse();
    corsHandler(
      { method: "POST", headers: { origin: "https://evil.example" } },
      res,
      next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
