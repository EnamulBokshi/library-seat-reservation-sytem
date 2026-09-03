import { Router } from "express";
import { BookController } from "./book.controller";
import authCheck from "../../middleware/authCheck";
import requestValidator from "../../middleware/requestValidator";
import { BookValidation } from "./book.validation";
import { upload } from "../../lib/cloudinary";

const bookRoute: Router = Router();

// Public / Authenticated catalog endpoints
bookRoute.get("/categories", BookController.getCategories);
bookRoute.get("/spatial-index", BookController.getSpatialIndex);
bookRoute.get("/", BookController.getAllBooks);
bookRoute.get("/:id", BookController.getBookById);

// Admin / Librarian media upload endpoint
bookRoute.post(
  "/upload-image",
  authCheck("admin", "librarian"),
  upload.single("image"),
  BookController.uploadBookImage
);

// Admin / Librarian management endpoints
bookRoute.post(
  "/",
  authCheck("admin", "librarian"),
  upload.single("image"),
  requestValidator(BookValidation.createBookSchema),
  BookController.createBook
);

bookRoute.patch(
  "/:id",
  authCheck("admin", "librarian"),
  upload.single("image"),
  requestValidator(BookValidation.updateBookSchema),
  BookController.updateBook
);

bookRoute.delete(
  "/:id",
  authCheck("admin", "librarian"),
  BookController.deleteBook
);

export default bookRoute;
