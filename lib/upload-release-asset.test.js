const mock = require('mock-fs');
const nock = require('nock')
const core = require('@actions/core');
const run = require('./upload-release-asset');

/* eslint-disable no-undef */
describe('Upload Release Asset', () => {
  process.env['GITHUB_OWNER'] = "owner"
  process.env['GITHUB_REPO'] = "repo";
  process.env['INPUT_GITHUB-TOKEN'] = "abc";

  let out;
  let failed;

  beforeEach(function() {
    mock({
      'out': {
        '1.txt': 'little content'
      }
    });
    out = jest.spyOn(core, 'setOutput');
    failed = jest.spyOn(core, 'setFailed');
  });

  afterEach(() => {
    mock.restore();
    jest.restoreAllMocks();
  });

  test('Upload release asset endpoint is called', async () => {
    process.env['INPUT_UPLOAD_URL'] = 'https://api.github.com/repos/owner/repo/releases/1/assets';
    process.env['INPUT_ASSET_PATH'] = 'out/1.txt'
    process.env['INPUT_ASSET_NAME'] = '1.txt'
    process.env['INPUT_ASSET_CONTENT_TYPE'] = 'text/plain'

    const scope = nock('https://api.github.com')
        .post('/repos/owner/repo/releases/1/assets',
            {
              name: "1.txt",
              file: {
                type: "Buffer",
                data: [108,105,116,116,108,101,32,99,111,110,116,101,110,116]
              }
            }
        )
        .reply(201, { browser_download_url: "https://download.com"});

    const out = jest.spyOn(core, 'setOutput');
    const failed = jest.spyOn(core, 'setFailed');

    await run();

    expect(scope.isDone()).toBeTruthy()
    expect(out).toHaveBeenNthCalledWith(1, 'browser_download_url', 'https://download.com');
    expect(failed).toHaveBeenCalledTimes(0);
  });

  test('Action fails elegantly', async () => {
    process.env['INPUT_UPLOAD_URL'] = 'https://api.github.com/repos/owner/repo/releases/1/assets';
    process.env['INPUT_ASSET_PATH'] = 'out/1.txt'
    process.env['INPUT_ASSET_NAME'] = '1.txt'
    process.env['INPUT_ASSET_CONTENT_TYPE'] = 'text/plain'

    const scope = nock('https://api.github.com')
        .post('/repos/owner/repo/releases/1/assets',
            {
              name: "1.txt",
              file: {
                type: "Buffer",
                data: [108,105,116,116,108,101,32,99,111,110,116,101,110,116]
              }
            }
        )
        .reply(500, { error: "Internal server error"});



    await run();

    expect(scope.isDone()).toBeTruthy()
    expect(out).toHaveBeenCalledTimes(0);
    expect(failed).toHaveBeenNthCalledWith(1, "Unknown error: {\"error\":\"Internal server error\"}");
  });

  test('Missing file', async () => {
    process.env['INPUT_UPLOAD_URL'] = 'https://api.github.com/repos/owner/repo/releases/1/assets';
    process.env['INPUT_ASSET_PATH'] = 'out/2.zip'
    process.env['INPUT_ASSET_NAME'] = '2.zip'
    process.env['INPUT_ASSET_CONTENT_TYPE'] = 'application/octostream'

    await run();

    expect(out).toHaveBeenCalledTimes(0);
    expect(failed).toHaveBeenNthCalledWith(1, "ENOENT: no such file or directory, stat 'out/2.zip'");
  });
});
