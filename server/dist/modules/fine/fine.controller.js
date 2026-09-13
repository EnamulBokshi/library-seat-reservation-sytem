"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FineController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const CatchAsync_1 = __importDefault(require("../../helpers/CatchAsync"));
const SendResponse_1 = require("../../helpers/SendResponse");
const fine_service_1 = require("./fine.service");
const getStats = (0, CatchAsync_1.default)(async (_req, res) => {
    const result = await fine_service_1.FineService.getFineStats();
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Fine statistics retrieved successfully.",
        data: result,
    });
});
const getAllFines = (0, CatchAsync_1.default)(async (req, res) => {
    const options = {
        source: req.query.source || "all",
        status: req.query.status || "all",
        paymentMethod: req.query.paymentMethod || "all",
        searchTerm: req.query.searchTerm,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: req.query.page ? parseInt(req.query.page, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
        sortBy: req.query.sortBy || "incurredAt",
        sortOrder: (req.query.sortOrder || "desc"),
    };
    const result = await fine_service_1.FineService.getAllFines(options);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Fine ledger records retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});
const payFine = (0, CatchAsync_1.default)(async (req, res) => {
    const librarianId = req.user.userId;
    const source = req.params.source;
    const id = req.params.id;
    const result = await fine_service_1.FineService.payFine(source, id, req.body, librarianId);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Fine payment settled successfully.",
        data: result,
    });
});
const waiveFine = (0, CatchAsync_1.default)(async (req, res) => {
    const librarianId = req.user.userId;
    const source = req.params.source;
    const id = req.params.id;
    const result = await fine_service_1.FineService.waiveFine(source, id, req.body, librarianId);
    (0, SendResponse_1.sendResponse)(res, {
        httpStatusCode: http_status_1.default.OK,
        success: true,
        message: "Fine waived successfully.",
        data: result,
    });
});
exports.FineController = {
    getStats,
    getAllFines,
    payFine,
    waiveFine,
};
