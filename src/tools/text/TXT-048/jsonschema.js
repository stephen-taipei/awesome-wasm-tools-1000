/**
 * TXT-048: JSON Schema Validator
 *
 * Validates JSON data against JSON Schema.
 */

class JSONSchemaValidator {
  constructor() {
    this.init();
  }

  init() {
    this.schemaText = document.getElementById('schemaText');
    this.dataText = document.getElementById('dataText');
    this.validateBtn = document.getElementById('validateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.resultContent = document.getElementById('resultContent');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.validateBtn.addEventListener('click', () => this.validate());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  validate() {
    const schemaStr = this.schemaText.value.trim();
    const dataStr = this.dataText.value.trim();

    if (!schemaStr) {
      this.showStatus('error', '請輸入 JSON Schema');
      return;
    }

    if (!dataStr) {
      this.showStatus('error', '請輸入 JSON 資料');
      return;
    }

    let schema, data;

    try {
      schema = JSON.parse(schemaStr);
    } catch (e) {
      this.showStatus('error', `Schema 解析錯誤: ${e.message}`);
      return;
    }

    try {
      data = JSON.parse(dataStr);
    } catch (e) {
      this.showStatus('error', `JSON 資料解析錯誤: ${e.message}`);
      return;
    }

    const errors = this.validateAgainstSchema(data, schema, '');

    this.resultArea.style.display = 'block';

    if (errors.length === 0) {
      this.resultContent.innerHTML = '<div class="success-message">✓ 驗證通過！資料符合 Schema 定義。</div>';
      this.showStatus('success', '驗證通過');
    } else {
      const errorHtml = errors.map(e => `<li>${e}</li>`).join('');
      this.resultContent.innerHTML = `
        <div class="error-message">✗ 驗證失敗！發現 ${errors.length} 個錯誤：</div>
        <ul class="error-list">${errorHtml}</ul>
      `;
      this.showStatus('error', `發現 ${errors.length} 個錯誤`);
    }
  }

  validateAgainstSchema(data, schema, path) {
    const errors = [];

    if (!schema || typeof schema !== 'object') {
      return errors;
    }

    const currentPath = path || 'root';

    // Type validation
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      const actualType = this.getType(data);

      if (!types.includes(actualType)) {
        errors.push(`${currentPath}: 期望類型為 ${types.join(' 或 ')}，實際為 ${actualType}`);
        return errors;
      }
    }

    // Enum validation
    if (schema.enum) {
      if (!schema.enum.some(v => JSON.stringify(v) === JSON.stringify(data))) {
        errors.push(`${currentPath}: 值必須是以下之一: ${schema.enum.map(v => JSON.stringify(v)).join(', ')}`);
      }
    }

    // Const validation
    if (schema.const !== undefined) {
      if (JSON.stringify(data) !== JSON.stringify(schema.const)) {
        errors.push(`${currentPath}: 值必須是 ${JSON.stringify(schema.const)}`);
      }
    }

    // String validations
    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push(`${currentPath}: 字串長度必須至少 ${schema.minLength} 個字元`);
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push(`${currentPath}: 字串長度不能超過 ${schema.maxLength} 個字元`);
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(data)) {
          errors.push(`${currentPath}: 字串不符合模式 ${schema.pattern}`);
        }
      }
      if (schema.format) {
        const formatError = this.validateFormat(data, schema.format);
        if (formatError) {
          errors.push(`${currentPath}: ${formatError}`);
        }
      }
    }

    // Number validations
    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push(`${currentPath}: 值必須大於或等於 ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push(`${currentPath}: 值必須小於或等於 ${schema.maximum}`);
      }
      if (schema.exclusiveMinimum !== undefined && data <= schema.exclusiveMinimum) {
        errors.push(`${currentPath}: 值必須大於 ${schema.exclusiveMinimum}`);
      }
      if (schema.exclusiveMaximum !== undefined && data >= schema.exclusiveMaximum) {
        errors.push(`${currentPath}: 值必須小於 ${schema.exclusiveMaximum}`);
      }
      if (schema.multipleOf !== undefined && data % schema.multipleOf !== 0) {
        errors.push(`${currentPath}: 值必須是 ${schema.multipleOf} 的倍數`);
      }
    }

    // Array validations
    if (Array.isArray(data)) {
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        errors.push(`${currentPath}: 陣列至少需要 ${schema.minItems} 個元素`);
      }
      if (schema.maxItems !== undefined && data.length > schema.maxItems) {
        errors.push(`${currentPath}: 陣列最多只能有 ${schema.maxItems} 個元素`);
      }
      if (schema.uniqueItems) {
        const seen = new Set();
        for (const item of data) {
          const key = JSON.stringify(item);
          if (seen.has(key)) {
            errors.push(`${currentPath}: 陣列元素必須唯一`);
            break;
          }
          seen.add(key);
        }
      }
      if (schema.items) {
        for (let i = 0; i < data.length; i++) {
          errors.push(...this.validateAgainstSchema(data[i], schema.items, `${currentPath}[${i}]`));
        }
      }
    }

    // Object validations
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const keys = Object.keys(data);

      if (schema.minProperties !== undefined && keys.length < schema.minProperties) {
        errors.push(`${currentPath}: 物件至少需要 ${schema.minProperties} 個屬性`);
      }
      if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) {
        errors.push(`${currentPath}: 物件最多只能有 ${schema.maxProperties} 個屬性`);
      }

      // Required properties
      if (schema.required) {
        for (const req of schema.required) {
          if (!(req in data)) {
            errors.push(`${currentPath}: 缺少必要屬性 "${req}"`);
          }
        }
      }

      // Property validations
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in data) {
            errors.push(...this.validateAgainstSchema(data[key], propSchema, `${currentPath}.${key}`));
          }
        }
      }

      // Additional properties
      if (schema.additionalProperties === false) {
        const allowedKeys = new Set(Object.keys(schema.properties || {}));
        for (const key of keys) {
          if (!allowedKeys.has(key)) {
            errors.push(`${currentPath}: 不允許的額外屬性 "${key}"`);
          }
        }
      }
    }

    return errors;
  }

  getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number' && Number.isInteger(value)) return 'integer';
    return typeof value;
  }

  validateFormat(value, format) {
    const formats = {
      'email': {
        regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: '無效的電子郵件格式'
      },
      'uri': {
        regex: /^https?:\/\/.+/,
        message: '無效的 URI 格式'
      },
      'date': {
        regex: /^\d{4}-\d{2}-\d{2}$/,
        message: '無效的日期格式 (應為 YYYY-MM-DD)'
      },
      'date-time': {
        regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        message: '無效的日期時間格式'
      },
      'time': {
        regex: /^\d{2}:\d{2}:\d{2}/,
        message: '無效的時間格式 (應為 HH:MM:SS)'
      },
      'ipv4': {
        regex: /^(\d{1,3}\.){3}\d{1,3}$/,
        message: '無效的 IPv4 格式'
      },
      'ipv6': {
        regex: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
        message: '無效的 IPv6 格式'
      },
      'uuid': {
        regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        message: '無效的 UUID 格式'
      }
    };

    const validator = formats[format];
    if (validator && !validator.regex.test(value)) {
      return validator.message;
    }

    return null;
  }

  clear() {
    this.schemaText.value = '';
    this.dataText.value = '';
    this.resultArea.style.display = 'none';
    this.resultContent.innerHTML = '';
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.jsonSchemaValidator = new JSONSchemaValidator();
});

export default JSONSchemaValidator;
