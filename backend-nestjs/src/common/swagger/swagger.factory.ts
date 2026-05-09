import { INestApplication } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import {
  SWAGGER_MODULES_CONFIG,
  SWAGGER_MODULES_CONFIG_LIST,
} from './swagger-modules.config';
import {
  SWAGGER_GLOBAL_METADATA,
  SWAGGER_MODULES_METADATA_LIST,
  type SwaggerModuleKey,
} from './swagger.metadata';

type SwaggerDocumentMap = Record<SwaggerModuleKey, OpenAPIObject>;

type SwaggerSelectorModuleSummary = {
  key: SwaggerModuleKey;
  title: string;
  description: string;
  docsPath: string;
  endpointCount: number;
};

function stripLeadingSlash(path: string) {
  return path.replace(/^\//, '');
}

function buildDocumentConfig(title: string, description: string) {
  return new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(SWAGGER_GLOBAL_METADATA.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: SWAGGER_GLOBAL_METADATA.bearerAuthDescription,
      },
      SWAGGER_GLOBAL_METADATA.bearerAuthSchemeName,
    )
    .build();
}

function attachTags(
  document: OpenAPIObject,
  tags: Array<{ name: string; description: string }>,
) {
  document.tags = tags;
  return document;
}

function createAllDocument(app: INestApplication) {
  const document = SwaggerModule.createDocument(
    app,
    buildDocumentConfig(
      SWAGGER_GLOBAL_METADATA.allDocumentTitle,
      SWAGGER_GLOBAL_METADATA.allDocumentDescription,
    ),
    {
      deepScanRoutes: true,
    },
  );

  return attachTags(
    document,
    SWAGGER_MODULES_METADATA_LIST.map((moduleMetadata) => ({
      name: moduleMetadata.tagName,
      description: moduleMetadata.tagDescription,
    })),
  );
}

function createModuleDocuments(app: INestApplication): SwaggerDocumentMap {
  return Object.fromEntries(
    SWAGGER_MODULES_CONFIG_LIST.map((moduleConfig) => {
      const document = SwaggerModule.createDocument(
        app,
        buildDocumentConfig(
          `${moduleConfig.title} - Edu Scan Backend`,
          [
            moduleConfig.description,
            'Tài liệu này chỉ hiển thị các endpoint thuộc đúng phân hệ đã chọn.',
            'Các phản hồi vẫn tuân theo cấu trúc chuẩn hóa toàn cục của hệ thống.',
          ].join('\n\n'),
        ),
        {
          include: [moduleConfig.moduleClass],
          deepScanRoutes: true,
        },
      );

      attachTags(document, [
        {
          name: moduleConfig.tagName,
          description: moduleConfig.tagDescription,
        },
      ]);

      return [moduleConfig.key, document];
    }),
  ) as SwaggerDocumentMap;
}

function exportSwaggerDocuments(
  allDocument: OpenAPIObject,
  moduleDocuments: SwaggerDocumentMap,
) {
  const exportDirectory = join(
    process.cwd(),
    SWAGGER_GLOBAL_METADATA.exportDirectory,
  );

  mkdirSync(exportDirectory, { recursive: true });

  writeFileSync(
    join(exportDirectory, SWAGGER_GLOBAL_METADATA.exportFileName),
    JSON.stringify(allDocument, null, 2),
    'utf8',
  );

  for (const moduleConfig of SWAGGER_MODULES_CONFIG_LIST) {
    writeFileSync(
      join(exportDirectory, moduleConfig.exportFileName),
      JSON.stringify(moduleDocuments[moduleConfig.key], null, 2),
      'utf8',
    );
  }
}

function buildSwaggerSelectorHtml(modules: SwaggerSelectorModuleSummary[]) {
  const moduleCards = modules
    .map(
      (moduleItem) => `
        <a class="module-card" href="${moduleItem.docsPath}">
          <div class="module-key">/${moduleItem.key}</div>
          <h2>${moduleItem.title}</h2>
          <p>${moduleItem.description}</p>
          <span>${moduleItem.endpointCount} endpoint</span>
        </a>
      `,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${SWAGGER_GLOBAL_METADATA.selectorTitle}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f7fb;
        --panel: #ffffff;
        --text: #18314f;
        --muted: #4f6986;
        --border: #d7e1ec;
        --accent: #0f6cbd;
        --accent-soft: #e8f1fb;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", "Helvetica Neue", sans-serif;
        background: radial-gradient(circle at top left, #ffffff 0%, var(--bg) 65%);
        color: var(--text);
      }
      main {
        max-width: 1120px;
        margin: 0 auto;
        padding: 48px 24px 64px;
      }
      .hero {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: flex-start;
        margin-bottom: 32px;
      }
      .hero h1 {
        margin: 0 0 12px;
        font-size: 2.2rem;
        line-height: 1.2;
      }
      .hero p {
        margin: 0;
        max-width: 700px;
        color: var(--muted);
        line-height: 1.6;
      }
      .hero a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 200px;
        padding: 14px 18px;
        border-radius: 14px;
        background: var(--accent);
        color: #fff;
        text-decoration: none;
        font-weight: 600;
        box-shadow: 0 12px 24px rgba(15, 108, 189, 0.16);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 18px;
      }
      .module-card {
        display: block;
        padding: 20px;
        border-radius: 18px;
        border: 1px solid var(--border);
        background: var(--panel);
        text-decoration: none;
        color: inherit;
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      }
      .module-card:hover {
        transform: translateY(-2px);
        border-color: #b8d0e7;
        box-shadow: 0 14px 30px rgba(24, 49, 79, 0.08);
      }
      .module-key {
        display: inline-flex;
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .module-card h2 {
        margin: 14px 0 10px;
        font-size: 1.1rem;
      }
      .module-card p {
        margin: 0 0 16px;
        color: var(--muted);
        line-height: 1.55;
      }
      .module-card span {
        color: var(--accent);
        font-weight: 600;
      }
      @media (max-width: 720px) {
        .hero {
          flex-direction: column;
        }
        .hero a {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div>
          <h1>${SWAGGER_GLOBAL_METADATA.selectorTitle}</h1>
          <p>${SWAGGER_GLOBAL_METADATA.selectorDescription}</p>
        </div>
        <a href="${SWAGGER_GLOBAL_METADATA.docsAllPath}">Mở tài liệu tổng hợp</a>
      </section>
      <section class="grid">
        ${moduleCards}
      </section>
    </main>
  </body>
</html>`;
}

function registerSwaggerSelector(
  app: INestApplication,
  moduleDocuments: SwaggerDocumentMap,
) {
  const expressApp = app.getHttpAdapter().getInstance();
  const modules = SWAGGER_MODULES_CONFIG_LIST.map((moduleConfig) => ({
    key: moduleConfig.key,
    title: moduleConfig.title,
    description: moduleConfig.description,
    docsPath: moduleConfig.docsPath,
    endpointCount: Object.keys(moduleDocuments[moduleConfig.key].paths).length,
  }));

  const html = buildSwaggerSelectorHtml(modules);

  expressApp.get(SWAGGER_GLOBAL_METADATA.docsIndexPath, (_req, res) => {
    res.type('html').send(html);
  });

  expressApp.get(`${SWAGGER_GLOBAL_METADATA.docsIndexPath}/`, (_req, res) => {
    res.type('html').send(html);
  });
}

function setupAllSwaggerUi(app: INestApplication, allDocument: OpenAPIObject) {
  SwaggerModule.setup(
    stripLeadingSlash(SWAGGER_GLOBAL_METADATA.docsAllPath),
    app,
    allDocument,
    {
      customSiteTitle: SWAGGER_GLOBAL_METADATA.siteTitle,
      jsonDocumentUrl: SWAGGER_GLOBAL_METADATA.docsJsonAllPath,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        urls: [
          {
            url: SWAGGER_GLOBAL_METADATA.docsJsonAllPath,
            name: 'Tài liệu tổng hợp',
          },
          ...SWAGGER_MODULES_CONFIG_LIST.map((moduleConfig) => ({
            url: moduleConfig.jsonPath,
            name: moduleConfig.title,
          })),
        ],
        'urls.primaryName': 'Tài liệu tổng hợp',
      },
    },
  );
}

function setupModuleSwaggerUis(
  app: INestApplication,
  moduleDocuments: SwaggerDocumentMap,
) {
  for (const moduleConfig of SWAGGER_MODULES_CONFIG_LIST) {
    SwaggerModule.setup(
      stripLeadingSlash(moduleConfig.docsPath),
      app,
      moduleDocuments[moduleConfig.key],
      {
        customSiteTitle: `${moduleConfig.title} - Swagger`,
        jsonDocumentUrl: moduleConfig.jsonPath,
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'list',
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
        },
      },
    );
  }
}

export function setupSwagger(app: INestApplication) {
  const allDocument = createAllDocument(app);
  const moduleDocuments = createModuleDocuments(app);

  exportSwaggerDocuments(allDocument, moduleDocuments);
  registerSwaggerSelector(app, moduleDocuments);
  setupAllSwaggerUi(app, allDocument);
  setupModuleSwaggerUis(app, moduleDocuments);

  return {
    allDocument,
    moduleDocuments,
  };
}

export function getSwaggerModuleConfig(moduleKey: SwaggerModuleKey) {
  return SWAGGER_MODULES_CONFIG[moduleKey];
}
