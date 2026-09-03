import { Router } from "express";
import { SettingController } from "./setting.controller";
import authCheck from "../../middleware/authCheck";

const settingRoute: Router = Router();

// GET public configuration (slot timings, advance booking days)
settingRoute.get("/public/config", SettingController.getPublicConfig);

// GET all settings (Admin, Librarian)
settingRoute.get("/", authCheck("admin", "librarian"), SettingController.getAllSettings);

// GET setting by key
settingRoute.get("/:key", authCheck(), SettingController.getSettingByKey);

// PATCH update setting (Admin only)
settingRoute.patch("/:key", authCheck("admin"), SettingController.updateSetting);

export default settingRoute;
