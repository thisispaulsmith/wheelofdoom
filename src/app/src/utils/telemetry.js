import { ApplicationInsights } from '@microsoft/applicationinsights-web';

let appInsights = null;

export function initializeTelemetry() {
  const connectionString = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING;

  if (!import.meta.env.PROD || !connectionString) {
    console.log('Application Insights disabled (development mode)');
    return;
  }

  try {
    appInsights = new ApplicationInsights({
      config: {
        connectionString: connectionString,
        enableAutoRouteTracking: true,
        enableCorsCorrelation: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
        distributedTracingMode: 2,  // W3C
        autoTrackPageVisitTime: true,
        disableAjaxTracking: false,
        disableFetchTracking: false,
      },
    });

    appInsights.loadAppInsights();

    appInsights.addTelemetryInitializer((envelope) => {
      envelope.tags = envelope.tags || [];
      envelope.tags['ai.cloud.role'] = 'WheelOfDoom-Frontend';
      envelope.tags['ai.cloud.roleInstance'] = 'browser';
    });

    console.log('Application Insights initialized');
  } catch (error) {
    console.error('Failed to initialize Application Insights:', error);
  }
}

export function trackEvent(name, properties = {}, measurements = {}) {
  if (appInsights) {
    appInsights.trackEvent({ name, properties, measurements });
  }
}

export function trackException(error, severityLevel = 3, properties = {}) {
  if (appInsights) {
    appInsights.trackException({
      exception: error,
      severityLevel,
      properties,
    });
  }
}

export function isTelemetryEnabled() {
  return appInsights !== null;
}
