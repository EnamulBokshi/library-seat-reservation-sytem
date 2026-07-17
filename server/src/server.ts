import app from "./app";
import { envVars } from "./config/envVars";

const PORT = envVars.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});