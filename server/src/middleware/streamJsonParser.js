const { Writable } = require('stream');

class StreamJsonParser extends Writable {
  constructor(options = {}) {
    super(options);
    this.buffer = '';
    this.depth = 0;
    this.inString = false;
    this.escapeNext = false;
    this.items = [];
    this.isArray = false;
    this.currentItemStart = -1;
    this.arrayStartIndex = -1;
    this.onItem = options.onItem || null;
    this.maxItemSize = options.maxItemSize || 1024 * 1024;
    this.totalBytes = 0;
    this.maxBodySize = options.maxBodySize || 10 * 1024 * 1024;
  }

  _write(chunk, encoding, callback) {
    const str = chunk.toString('utf8');
    this.totalBytes += chunk.length;

    if (this.totalBytes > this.maxBodySize) {
      callback(new Error('请求体过大'));
      return;
    }

    this.buffer += str;
    this._parseBuffer();
    callback();
  }

  _parseBuffer() {
    let i = 0;
    const buf = this.buffer;
    const len = buf.length;

    while (i < len) {
      const char = buf[i];

      if (this.escapeNext) {
        this.escapeNext = false;
        i++;
        continue;
      }

      if (this.inString) {
        if (char === '\\') {
          this.escapeNext = true;
        } else if (char === '"') {
          this.inString = false;
        }
        i++;
        continue;
      }

      if (char === '"') {
        this.inString = true;
        i++;
        continue;
      }

      if (char === '[' && this.depth === 0) {
        this.isArray = true;
        this.arrayStartIndex = i;
        this.depth++;
        i++;
        continue;
      }

      if (char === '{' && this.depth === 1 && this.isArray) {
        this.currentItemStart = i;
        this.depth++;
        i++;
        continue;
      }

      if (char === '{') {
        if (this.depth === 0 && !this.isArray) {
          this.currentItemStart = i;
        }
        this.depth++;
      }

      if (char === '}') {
        this.depth--;

        if (this.depth === 1 && this.isArray && this.currentItemStart >= 0) {
          const itemStr = buf.substring(this.currentItemStart, i + 1);
          this._handleItem(itemStr);
          this.currentItemStart = -1;
        } else if (this.depth === 0 && !this.isArray && this.currentItemStart >= 0) {
          const itemStr = buf.substring(this.currentItemStart, i + 1);
          this._handleItem(itemStr);
          this.currentItemStart = -1;
        }
      }

      if (char === ']' && this.depth === 1 && this.isArray) {
        this.depth--;
      }

      i++;
    }

    const processedLen = Math.min(len, this._findSafeTrimPoint());
    if (processedLen > 0) {
      this.buffer = this.buffer.substring(processedLen);
    }
  }

  _findSafeTrimPoint() {
    if (this.currentItemStart > 0 && this.isArray) {
      return this.currentItemStart;
    }
    if (this.arrayStartIndex >= 0) {
      return this.arrayStartIndex;
    }
    return 0;
  }

  _handleItem(itemStr) {
    try {
      if (itemStr.length > this.maxItemSize) {
        throw new Error('单条数据过大');
      }

      const item = JSON.parse(itemStr);
      this.items.push(item);

      if (this.onItem) {
        this.onItem(item);
      }
    } catch (e) {
      console.error('[StreamParser] 解析单项失败:', e.message);
    }
  }

  getResults() {
    return this.isArray ? this.items : (this.items[0] || null);
  }

  getItemCount() {
    return this.items.length;
  }
}

const streamParseJson = (options = {}) => {
  return async (ctx, next) => {
    if (ctx.method !== 'POST' || ctx.request.type !== 'application/json') {
      await next();
      return;
    }

    await new Promise((resolve, reject) => {
      const parser = new StreamJsonParser(options);

      ctx.req.on('error', reject);
      parser.on('error', reject);
      parser.on('finish', () => {
        ctx.request.rawBody = parser.getResults();
        ctx.request._itemCount = parser.getItemCount();
        resolve();
      });

      ctx.req.pipe(parser);
    });

    await next();
  };
};

module.exports = {
  StreamJsonParser,
  streamParseJson,
};
