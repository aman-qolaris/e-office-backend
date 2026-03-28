import { Router } from "express";
import jwt from "jsonwebtoken";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { User, Designation } from "../database/models/index.js";
import * as allConstants from "../config/constants.js";

const router = Router();

router.get("/constants", async (req, res) => {
  const safeConstants = {
    ...allConstants,
    ROLES: { ...allConstants.ROLES },
  };

  let showHiddenOptions = false;

  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      const decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET,
      );

      const currentUser = await User.findByPk(decoded.id, {
        include: [{ model: Designation, as: "designation" }],
      });

      if (
        currentUser &&
        currentUser.designation?.name === allConstants.DESIGNATIONS.PRESIDENT
      ) {
        showHiddenOptions = true;
      }
    }
  } catch (err) {
    showHiddenOptions = false;
  }
  if (!showHiddenOptions) {
    delete safeConstants.ROLES.ADMIN;
  }

  res.status(200).json({
    success: true,
    data: safeConstants,
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modulesDir = path.join(__dirname, "..", "modules");

const normalizeMountPath = (mountPath) => {
  if (typeof mountPath !== "string") return null;
  const trimmed = mountPath.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const loadModuleRoutes = async () => {
  let moduleEntries;
  try {
    moduleEntries = await fs.readdir(modulesDir, { withFileTypes: true });
  } catch {
    return;
  }

  const moduleDirs = moduleEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const moduleName of moduleDirs) {
    const routesDir = path.join(modulesDir, moduleName, "routes");

    let routeEntries;
    try {
      routeEntries = await fs.readdir(routesDir, { withFileTypes: true });
    } catch {
      continue;
    }

    const routeFiles = routeEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".routes.js"))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    for (const routeFile of routeFiles) {
      const routeFilePath = path.join(routesDir, routeFile);
      const imported = await import(pathToFileURL(routeFilePath).href);

      const routeRouter = imported?.default;
      if (!routeRouter) continue;

      const explicitBasePath =
        imported.basePath ?? imported.BASE_PATH ?? imported.routeBasePath;
      const mountPath =
        normalizeMountPath(explicitBasePath) ?? `/${moduleName}`;

      router.use(mountPath, routeRouter);
    }
  }
};

await loadModuleRoutes();

export default router;
