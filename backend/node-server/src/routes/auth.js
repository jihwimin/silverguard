console.log("✅ auth.js loaded version: OTP DEBUG 2026-03-01");

const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const twilio = require("twilio");

const User = require("../models/User");

const router = express.Router();

/** -----------------------
 *  Twilio client
 *  ----------------------*/
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/** -----------------------
 *  Helpers
 *  ----------------------*/
const loginSchema = z.object({
  phoneE164: z.string().min(8),
  role: z.enum(["senior", "guardian"]),
});

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = payload; // { userId, role, phoneE164 }
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function make6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** -----------------------
 *  0) OTP SEND (문자 보내기)
 *  ----------------------*/
router.post("/otp/send", async (req, res) => {
  console.log("✅ HIT /otp/send", req.body);

  const parsed = z.object({ phoneE164: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid phone" });

  const { phoneE164 } = parsed.data;

  try {
    await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phoneE164, channel: "sms" });

    return res.json({ ok: true });
  } catch (e) {
    console.log("=== TWILIO SEND ERROR START ===");
    console.log("status:", e?.status);
    console.log("code:", e?.code);
    console.log("message:", e?.message);
    console.log("moreInfo:", e?.moreInfo);
    console.log("details:", e?.details);
    console.log("raw:", JSON.stringify(e, null, 2));
    console.log("=== TWILIO SEND ERROR END ===");
    const msg = e?.message || "Failed to send OTP";
    return res.status(500).json({ error: "Failed to send OTP", details: msg });
  }
});

/** -----------------------
 *  1) OTP VERIFY (코드 확인 → 유저 생성/조회 → JWT 발급)
 *  ----------------------*/
router.post("/otp/verify", async (req, res) => {
  console.log("✅ HIT /otp/verify", req.body);

  const parsed = z
    .object({
      phoneE164: z.string().min(8),
      code: z.string().length(6),
      role: z.enum(["senior", "guardian"]),
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { phoneE164, code, role } = parsed.data;

  try {
    const check = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phoneE164, code });

    if (check.status !== "approved") {
      return res.status(401).json({ error: "Invalid OTP" });
    }

    let user = await User.findOne({ phoneE164 });

    // 해커톤 정책: 없으면 생성, 있으면 기존 role 유지
    if (!user) {
      user = await User.create({ phoneE164, role, linkedUserId: null });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role, phoneE164: user.phoneE164 },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "30d" }
    );

    return res.json({
      ok: true,
      token,
      user: { userId: user._id.toString(), role: user.role, phoneE164: user.phoneE164 },
    });
  } catch (e) {
    console.log("=== TWILIO VERIFY ERROR START ===");
    console.log("status:", e?.status);
    console.log("code:", e?.code);
    console.log("message:", e?.message);
    console.log("moreInfo:", e?.moreInfo);
    console.log("details:", e?.details);
    if (e?.response?.data) {
      console.log("response.data:", JSON.stringify(e.response.data, null, 2));
    }
    console.log("raw:", JSON.stringify(e, null, 2));
    console.log("=== TWILIO VERIFY ERROR END ===");
    return res.status(500).json({ error: "Failed to verify OTP" });
  }
});

/** -----------------------
 *  2) DEV LOGIN (임시) - 데모용 백업
 *  ----------------------*/
router.post("/dev-login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { phoneE164, role } = parsed.data;

  let user = await User.findOne({ phoneE164 });
  if (!user) user = await User.create({ phoneE164, role });

  const token = jwt.sign(
    { userId: user._id.toString(), role: user.role, phoneE164: user.phoneE164 },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "30d" }
  );

  return res.json({
    ok: true,
    token,
    user: { userId: user._id.toString(), role: user.role, phoneE164: user.phoneE164 },
  });
});

/** -----------------------
 *  3) LINK CODE 생성 (연동 코드 발급)
 *  ----------------------*/
router.post("/link/create-code", requireAuth, async (req, res) => {
  const userId = req.user.userId;

  const code = make6DigitCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const exists = await User.findOne({
    linkCode: code,
    linkCodeExpiresAt: { $gt: new Date() },
  });
  if (exists) return res.status(409).json({ error: "Try again" });

  await User.findByIdAndUpdate(userId, {
    linkCode: code,
    linkCodeExpiresAt: expiresAt,
  });

  return res.json({ ok: true, code, expiresAt });
});

/** -----------------------
 *  4) LINK CODE 입력 → 연결
 *  ----------------------*/
router.post("/link/confirm", requireAuth, async (req, res) => {
  const parsed = z.object({ code: z.string().length(6) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid code" });

  const { code } = parsed.data;

  const me = await User.findById(req.user.userId);
  if (!me) return res.status(404).json({ error: "User not found" });

  const owner = await User.findOne({
    linkCode: code,
    linkCodeExpiresAt: { $gt: new Date() },
  });

  if (!owner) return res.status(404).json({ error: "Code not found or expired" });
  if (owner._id.toString() === me._id.toString())
    return res.status(400).json({ error: "Cannot link to yourself" });

  if (me.linkedUserId || owner.linkedUserId)
    return res.status(409).json({ error: "One of users already linked" });

  me.linkedUserId = owner._id;
  owner.linkedUserId = me._id;

  owner.linkCode = null;
  owner.linkCodeExpiresAt = null;

  await owner.save();
  await me.save();

  return res.json({
    ok: true,
    linked: { me: me._id.toString(), other: owner._id.toString() },
  });
});

/** -----------------------
 *  5) UNLINK (연동 해제)
 *  ----------------------*/
router.post("/link/unlink", requireAuth, async (req, res) => {
  const me = await User.findById(req.user.userId);
  if (!me) return res.status(404).json({ error: "User not found" });
  if (!me.linkedUserId) return res.status(400).json({ error: "Not linked" });

  const other = await User.findById(me.linkedUserId);
  if (other) {
    other.linkedUserId = null;
    await other.save();
  }
  me.linkedUserId = null;
  await me.save();

  return res.json({ ok: true });
});

/** -----------------------
 *  6) ME (내 정보 + 연동 상태)
 *  ----------------------*/
router.get("/me", requireAuth, async (req, res) => {
  const me = await User.findById(req.user.userId).select(
    "_id phoneE164 role linkedUserId linkCode linkCodeExpiresAt createdAt updatedAt"
  );

  if (!me) return res.status(404).json({ error: "User not found" });

  let linkedUserId = null;
  let linkedUserPhone = null;
  if (me.linkedUserId) {
    const other = await User.findById(me.linkedUserId);
    if (other) {
      linkedUserId = me.linkedUserId.toString();
      linkedUserPhone = other.phoneE164;
    } else {
      me.linkedUserId = null;
      await me.save();
    }
  }

  return res.json({
    ok: true,
    userId: me._id.toString(),
    phoneE164: me.phoneE164,
    role: me.role,
    linkedUserId,
    linkedUserPhone,
    linkCode: me.linkCode,
    linkCodeExpiresAt: me.linkCodeExpiresAt,
    createdAt: me.createdAt,
    updatedAt: me.updatedAt,
  });
});

module.exports = router;