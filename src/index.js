const FileSystem = require("fs");
const Path = require("path");

const [input] = process.argv.slice(2, 3);
const { dir: directory, base: file } = Path.parse(
  Path.resolve(process.cwd(), input)
);

function parseDependency(dependency) {
  const matched = dependency.match(/^import (.*) from ['|"](\..*)['|"];/);

  if (matched) {
    const [orig, name, path] = matched;

    return { name, path };
  }

  return { name: null, path: null };
}

function isPathToDirectory(path, currentDirectory) {
  const combinedPath = Path.resolve(currentDirectory, path);
  const doesPathExists = FileSystem.existsSync(combinedPath);

  return Boolean(
    FileSystem.statSync(
      doesPathExists ? combinedPath : `${combinedPath}.jsx`
    ).isDirectory()
  );
}

function generateNextDirectory(isDirectory, currentDirectory, dependencyPath) {
  if (isDirectory) {
    return Path.resolve(currentDirectory, dependencyPath);
  }

  return currentDirectory;
}

function generateNextFilePath(isDirectory, currentDirectory, dependencyPath) {
  if (isDirectory) {
    return "index.jsx";
  }

  return `${Path.resolve(currentDirectory, dependencyPath)}.jsx`;
}

function mapImports(currentDirectory, currentFile, cwd = process.cwd()) {
  const currentAbsoluteDirectory = Path.resolve(cwd, currentDirectory);
  const currentPath = Path.resolve(currentAbsoluteDirectory, currentFile);
  const parsedFile = FileSystem.readFileSync(currentPath, { encoding: "utf8" });
  const dependencies = parsedFile.match(
    /^import (.*) from ['|"](\..*)['|"];/gm
  );
  const hasDependencies = Boolean(dependencies);

  let parsedDependencies = [];
  let result = {};

  if (hasDependencies) {
    parsedDependencies = dependencies.map(dependency => {
      const { path: dependencyPath, name: dependencyName } = parseDependency(
        dependency
      );

      const isDirectory = isPathToDirectory(dependencyPath, currentDirectory);

      const nextDirectory = generateNextDirectory(
        isDirectory,
        currentDirectory,
        dependencyPath
      );
      const nextFilePath = generateNextFilePath(
        isDirectory,
        currentDirectory,
        dependencyPath
      );

      result = {
        dependencyPath,
        isDirectory,
        orig: dependency,
        name: dependencyName,
        fileName: nextFilePath.split(/\\|\//)[
          nextFilePath.split(/\\|\//).length - 1
        ],
        dependencies: mapImports(nextDirectory, nextFilePath, currentDirectory)
      };

      return result;
    });

    return parsedDependencies;
  }

  return parsedDependencies;
}

mapImports(directory, file);
