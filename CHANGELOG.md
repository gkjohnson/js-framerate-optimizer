# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2021-04-17
### Added
- `addSample` function.

### Changed
- Add `"type": "module"` to package.json.

## [0.1.2] - 2018-11-04
### Fix
- SimpleOptimization calling calling `increaseWork` incorrectly.

## [0.1.1] - 2018-11-02
### Fix
- Correctly name option "maxWaitFrames" instead of "maxwaitFrames"

## [0.1.0] - 2018-11-02
### Changed
- Moved module to src folder
- Move all options onto an options sub-object

### Added
- UMD variant to umd folder
- Add "waitMillis" and "maxWaitFrames" options

## [0.0.2] - 2018-08-26
### Fixed
- Properly remove events from window on dispose.

## [0.0.1] - 2018-08-10
- Initial release
