module.exports = {
    "moduleDirectories": [
        "<rootDir>/node_modules/",
        "<rootDir>/src/",
    ],
    "roots": [
        "<rootDir>/src"
    ],
    "transform": {
        "^.+\\.tsx?$": "ts-jest"
    },
    "testRegex": "((/__tests__/\\.(test|spec))\\.tsx?)$|(/__tests__/.*Test\\.tsx?)$",
    "moduleFileExtensions": [
        "ts",
        "tsx",
        "js",
        "jsx",
        "json",
        "node"
    ],
};
