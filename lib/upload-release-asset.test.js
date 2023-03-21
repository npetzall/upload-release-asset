const mock = require('mock-fs');
const nock = require('nock')
const core = require('@actions/core');
const run = require('./upload-release-asset');

/* eslint-disable no-undef */
describe('Upload Release Asset', () => {
  process.env['GITHUB_REPOSITORY'] = "owner/repo";
  process.env['INPUT_TOKEN'] = "abc";

  beforeEach(function() {
    mock({
      'out': {
        '1.txt': 'little content'
      }
    }, {createCwd: true, createTmp: true});
    core.setOutput = jest.fn();
    core.setFailed = jest.fn();
  });

  afterEach(() => {
    mock.restore();
    jest.restoreAllMocks();
  });

  test('Upload release asset endpoint is called', async () => {
    process.env['INPUT_RELEASE_ID'] = '1';
    process.env['INPUT_ASSET_PATH'] = 'out/1.txt'
    process.env['INPUT_ASSET_NAME'] = '1.txt'
    process.env['INPUT_ASSET_CONTENT_TYPE'] = 'text/plain'

    const scope = nock('https://uploads.github.com')
        .post('/repos/owner/repo/releases/1/assets',
            Buffer.from('little content', 'utf-8')
        )
        .query({ name: "1.txt"})
        .reply(201, { browser_download_url: "https://download.com"});

    await run();

    expect(scope.isDone()).toBeTruthy()
    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'browser_download_url', 'https://download.com');
  });

  test('Action fails elegantly', async () => {
    process.env['INPUT_RELEASE_ID'] = '2';
    process.env['INPUT_ASSET_PATH'] = 'out/1.txt'
    process.env['INPUT_ASSET_NAME'] = '1.txt'
    process.env['INPUT_ASSET_CONTENT_TYPE'] = 'text/plain'

    const scope = nock('https://uploads.github.com')
        .post('/repos/owner/repo/releases/2/assets',
            Buffer.from('little content', 'utf-8')
        )
        .query({ name: "1.txt"})
        .reply(500, { error: "Internal server error"});



    await run();

    expect(scope.isDone()).toBeTruthy()
    expect(core.setOutput).toHaveBeenCalledTimes(0);
    expect(core.setFailed).toHaveBeenNthCalledWith(1, "Unknown error: {\"error\":\"Internal server error\"}");
  });

  test('Missing file', async () => {
    process.env['INPUT_RELEASE_ID'] = '3';
    process.env['INPUT_ASSET_PATH'] = 'out/2.zip'
    process.env['INPUT_ASSET_NAME'] = '2.zip'
    process.env['INPUT_ASSET_CONTENT_TYPE'] = 'application/octostream'

    await run();

    expect(core.setOutput).toHaveBeenCalledTimes(0);
    expect(core.setFailed).toHaveBeenNthCalledWith(1, "ENOENT: no such file or directory, stat 'out/2.zip'");
  });
});
