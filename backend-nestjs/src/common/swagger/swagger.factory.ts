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

function registerSwaggerJsonEndpoints(
  app: INestApplication,
  allDocument: OpenAPIObject,
  moduleDocuments: SwaggerDocumentMap,
) {
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.get(SWAGGER_GLOBAL_METADATA.docsJsonAllPath, (_req, res) => {
    res.json(allDocument);
  });

  for (const moduleConfig of SWAGGER_MODULES_CONFIG_LIST) {
    expressApp.get(moduleConfig.jsonPath, (_req, res) => {
      res.json(moduleDocuments[moduleConfig.key]);
    });
  }
}

function registerSwaggerRedirects(
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

  const buildDocsRedirectUrl = (primaryName: string) => {
    const query = new URLSearchParams({
      'urls.primaryName': primaryName,
    });
    return `${SWAGGER_GLOBAL_METADATA.docsIndexPath}?${query.toString()}`;
  };

  expressApp.get(SWAGGER_GLOBAL_METADATA.docsAllPath, (_req, res) => {
    res.redirect(302, buildDocsRedirectUrl('Tài liệu tổng hợp'));
  });

  for (const moduleItem of modules) {
    expressApp.get(moduleItem.docsPath, (_req, res) => {
      res.redirect(302, buildDocsRedirectUrl(moduleItem.title));
    });
  }
}

function setupAllSwaggerUi(app: INestApplication, allDocument: OpenAPIObject) {
  SwaggerModule.setup(
    stripLeadingSlash(SWAGGER_GLOBAL_METADATA.docsIndexPath),
    app,
    allDocument,
    {
      customSiteTitle: SWAGGER_GLOBAL_METADATA.siteTitle,
      jsonDocumentUrl: SWAGGER_GLOBAL_METADATA.docsJsonAllPath,
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        queryConfigEnabled: true,
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

export function setupSwagger(app: INestApplication) {
  const allDocument = createAllDocument(app);
  const moduleDocuments = createModuleDocuments(app);

  exportSwaggerDocuments(allDocument, moduleDocuments);
  registerSwaggerJsonEndpoints(app, allDocument, moduleDocuments);
  registerSwaggerRedirects(app, moduleDocuments);
  setupAllSwaggerUi(app, allDocument);

  return {
    allDocument,
    moduleDocuments,
  };
}

export function getSwaggerModuleConfig(moduleKey: SwaggerModuleKey) {
  return SWAGGER_MODULES_CONFIG[moduleKey];
}
