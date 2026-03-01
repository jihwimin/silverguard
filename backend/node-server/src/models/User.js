const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // 로그인용
    phoneE164: { type: String, required: true, unique: true },
    role: { type: String, enum: ["senior", "guardian"], required: true },

    // ✅ 가디언 연결 (상대 유저 id)
    linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // ✅ 6자리 연동 코드 (임시 저장)
    linkCode: { type: String, default: null },
    linkCodeExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
