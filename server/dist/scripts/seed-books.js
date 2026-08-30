"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("../lib/prisma"));
dotenv_1.default.config();
const sampleBooks = [
    {
        title: "Introduction to Algorithms (4th Edition)",
        author: "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
        isbn: "978-0262046305",
        category: "Computer Science",
        publisher: "MIT Press",
        publicationYear: 2022,
        edition: "4th",
        description: "A comprehensive update of the leading textbook on computer algorithms, covering trees, graph algorithms, dynamic programming, and amortized analysis.",
        coverImage: "https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&q=80&w=600",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        totalCopies: 5,
        availableCopies: 4,
        block: "Block A",
        shelfNumber: "Shelf 01",
        rowNumber: "Row 3",
        callNumber: "QA76.6 .C662 2022",
    },
    {
        title: "Design Patterns: Elements of Reusable Object-Oriented Software",
        author: "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
        isbn: "978-0201633610",
        category: "Software Engineering",
        publisher: "Addison-Wesley",
        publicationYear: 1994,
        edition: "1st",
        description: "Captures a wealth of experience about the design of object-oriented software and presents 23 classic design patterns.",
        coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        totalCopies: 4,
        availableCopies: 3,
        block: "Block A",
        shelfNumber: "Shelf 02",
        rowNumber: "Row 1",
        callNumber: "QA76.64 .D47 1994",
    },
    {
        title: "Clean Code: A Handbook of Agile Software Craftsmanship",
        author: "Robert C. Martin",
        isbn: "978-0132350884",
        category: "Software Engineering",
        publisher: "Prentice Hall",
        publicationYear: 2008,
        edition: "1st",
        description: "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
        coverImage: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=600",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        totalCopies: 6,
        availableCopies: 5,
        block: "Block A",
        shelfNumber: "Shelf 02",
        rowNumber: "Row 4",
        callNumber: "QA76.76.D47 M37 2008",
    },
    {
        title: "Database System Concepts (7th Edition)",
        author: "Abraham Silberschatz, Henry F. Korth, S. Sudarshan",
        isbn: "978-0078022159",
        category: "Database Systems",
        publisher: "McGraw-Hill",
        publicationYear: 2019,
        edition: "7th",
        description: "Presents the fundamental concepts of database management, SQL, relational models, indexing, transactions, and distributed architectures.",
        coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        totalCopies: 4,
        availableCopies: 4,
        block: "Block B",
        shelfNumber: "Shelf 04",
        rowNumber: "Row 2",
        callNumber: "QA76.9.D3 S56 2019",
    },
    {
        title: "Computer Networking: A Top-Down Approach (8th Edition)",
        author: "James F. Kurose, Keith W. Ross",
        isbn: "978-0136681557",
        category: "Networking",
        publisher: "Pearson",
        publicationYear: 2020,
        edition: "8th",
        description: "Focuses on the Internet and the fundamental principles of networking with a top-down application layer first approach.",
        coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=600",
        pdfUrl: "",
        totalCopies: 3,
        availableCopies: 2,
        block: "Block B",
        shelfNumber: "Shelf 05",
        rowNumber: "Row 1",
        callNumber: "TK5105.5 .K87 2020",
    },
    {
        title: "Artificial Intelligence: A Modern Approach (4th Edition)",
        author: "Stuart Russell, Peter Norvig",
        isbn: "978-0134610993",
        category: "Artificial Intelligence",
        publisher: "Pearson",
        publicationYear: 2020,
        edition: "4th",
        description: "The most comprehensive, up-to-date introduction to the theory and practice of artificial intelligence.",
        coverImage: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=600",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        totalCopies: 5,
        availableCopies: 5,
        block: "Block C",
        shelfNumber: "Shelf 08",
        rowNumber: "Row 3",
        callNumber: "Q335 .R87 2020",
    },
    {
        title: "Discrete Mathematics and Its Applications (8th Edition)",
        author: "Kenneth H. Rosen",
        isbn: "978-1259676512",
        category: "Mathematics",
        publisher: "McGraw-Hill",
        publicationYear: 2018,
        edition: "8th",
        description: "Precise, relevant, and comprehensive presentation of mathematical concepts for computer science and engineering majors.",
        coverImage: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600",
        pdfUrl: "",
        totalCopies: 3,
        availableCopies: 3,
        block: "Block D",
        shelfNumber: "Shelf 11",
        rowNumber: "Row 2",
        callNumber: "QA39.3 .R67 2018",
    },
];
async function seedBooks() {
    console.log("📚 Seeding sample library books with spatial locations and PDF links...");
    for (const book of sampleBooks) {
        const existing = await prisma_1.default.book.findFirst({
            where: { isbn: book.isbn },
        });
        if (existing) {
            console.log(`  ℹ️  Book already exists: ${book.title}`);
        }
        else {
            await prisma_1.default.book.create({
                data: book,
            });
            console.log(`  ✅ Added book: ${book.title} (📍 ${book.block} • ${book.shelfNumber} • ${book.rowNumber})`);
        }
    }
    // Seed default settings
    console.log("⚙️  Ensuring default borrow policy settings in database...");
    await prisma_1.default.setting.upsert({
        where: { key: "MAX_BORROW_LIMIT" },
        update: {},
        create: {
            key: "MAX_BORROW_LIMIT",
            value: "3",
            description: "Maximum active books a student can borrow concurrently",
        },
    });
    await prisma_1.default.setting.upsert({
        where: { key: "BORROW_PERIOD_DAYS" },
        update: {},
        create: {
            key: "BORROW_PERIOD_DAYS",
            value: "10",
            description: "Default borrow period duration in days",
        },
    });
    await prisma_1.default.setting.upsert({
        where: { key: "MAX_RENEWAL_LIMIT" },
        update: {},
        create: {
            key: "MAX_RENEWAL_LIMIT",
            value: "3",
            description: "Maximum number of renewals allowed per book",
        },
    });
    console.log("🎉 Seed finished successfully!");
}
seedBooks()
    .catch((e) => {
    console.error("Error seeding books:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.default.$disconnect();
});
