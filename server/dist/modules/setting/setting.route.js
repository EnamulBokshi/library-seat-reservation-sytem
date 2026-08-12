"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const setting_controller_1 = require("./setting.controller");
const authCheck_1 = __importDefault(require("../../middleware/authCheck"));
const settingRoute = (0, express_1.Router)();
// GET all settings (Admin, Librarian)
settingRoute.get("/", (0, authCheck_1.default)("admin", "librarian"), setting_controller_1.SettingController.getAllSettings);
// GET setting by key
settingRoute.get("/:key", (0, authCheck_1.default)(), setting_controller_1.SettingController.getSettingByKey);
// PATCH update setting (Admin only)
settingRoute.patch("/:key", (0, authCheck_1.default)("admin"), setting_controller_1.SettingController.updateSetting);
exports.default = settingRoute;
