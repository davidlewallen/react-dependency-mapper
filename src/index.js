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
      const nextDirectory = isDirectory
        ? Path.resolve(currentDirectory, dependencyPath)
        : currentDirectory;
      const nextFilePath = isDirectory
        ? "index.jsx"
        : `${Path.resolve(currentDirectory, dependencyPath)}.jsx`;

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

console.log(JSON.stringify(mapImports(directory, file), null, 2));

// ! Notes: Look into parsing path by using Path.relative and passin in the 'dependencyPath'
