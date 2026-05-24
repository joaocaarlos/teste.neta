// Test setup file
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-at-least-32-chars-long";
process.env.BCRYPT_ROUNDS = "1";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
