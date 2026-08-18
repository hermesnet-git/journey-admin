package com.jouney.admin.infrastructure.connector;

import com.jouney.admin.application.flow.ConnectorTestCommand;
import com.jouney.admin.application.flow.ConnectorTestPort;
import com.jouney.admin.application.flow.ConnectorTestResult;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Executes REST connector test calls server-side (REQ-03.10.002), so credentials never reach the
 * browser and CORS never comes into play. Blocks requests to private/loopback/reserved addresses
 * (REQ-03.10.003, toggle: {@code app.connector-test.block-private-networks} — off in the {@code dev}
 * profile, where the connectors under test are the local simulação services) and applies a short
 * timeout / response size cap (REQ-03.10.004). {@code {{name}}}
 * references in method/url/headers/body are resolved from {@code sampleVariables} before the call
 * (REQ-03.10.005) — there is no real journey execution here to resolve them from.
 */
@Component
public class ConnectorTestAdapter implements ConnectorTestPort {

    private static final int TIMEOUT_MS = 5_000;
    private static final int MAX_BODY_BYTES = 1_000_000;
    private static final Pattern VARIABLE_TOKEN = Pattern.compile("\\{\\{\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\}\\}");

    private final RestClient restClient;
    private final boolean blockPrivateNetworks;

    public ConnectorTestAdapter(@Value("${app.connector-test.block-private-networks:true}") boolean blockPrivateNetworks) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT_MS);
        factory.setReadTimeout(TIMEOUT_MS);
        this.restClient = RestClient.builder().requestFactory(factory).build();
        this.blockPrivateNetworks = blockPrivateNetworks;
    }

    @Override
    public ConnectorTestResult test(ConnectorTestCommand command) {
        Map<String, String> vars = command.sampleVariables() != null ? command.sampleVariables() : Map.of();
        String url = resolve(command.url(), vars);
        assertNotPrivateNetwork(url);

        Map<String, String> headers = new LinkedHashMap<>();
        if (command.headers() != null) {
            command.headers().forEach((k, v) -> headers.put(k, resolve(v, vars)));
        }
        Object body = resolveDeep(command.body(), vars);

        try {
            ResponseEntity<byte[]> response = restClient.method(HttpMethod.valueOf(command.method()))
                    .uri(url)
                    .headers(h -> headers.forEach(h::set))
                    .body(body != null ? body : "")
                    .retrieve()
                    .toEntity(byte[].class);
            return toResult(response);
        } catch (RestClientException e) {
            throw new ConnectorTestException("Connector test call to " + url + " failed: " + e.getMessage(), e);
        }
    }

    private ConnectorTestResult toResult(ResponseEntity<byte[]> response) {
        byte[] raw = response.getBody();
        String body = raw == null ? ""
                : new String(raw, 0, Math.min(raw.length, MAX_BODY_BYTES), StandardCharsets.UTF_8);
        Map<String, String> headers = new LinkedHashMap<>();
        HttpHeaders responseHeaders = response.getHeaders();
        responseHeaders.forEach((name, values) -> headers.put(name, values.isEmpty() ? "" : values.get(0)));
        return new ConnectorTestResult(response.getStatusCode().value(), headers, body);
    }

    // ponytail: DNS-resolution-time check only, no re-check on redirect targets — fine for a
    // manual design-time test call, would need per-request-hop enforcement for anything automated.
    private void assertNotPrivateNetwork(String url) {
        if (!blockPrivateNetworks) {
            return;
        }
        URI uri = URI.create(url);
        String scheme = uri.getScheme();
        if (!"http".equals(scheme) && !"https".equals(scheme)) {
            throw new SsrfBlockedException("Unsupported URL scheme: " + scheme);
        }
        try {
            InetAddress address = InetAddress.getByName(uri.getHost());
            if (address.isLoopbackAddress() || address.isSiteLocalAddress() || address.isLinkLocalAddress()
                    || address.isAnyLocalAddress() || address.isMulticastAddress()) {
                throw new SsrfBlockedException("URL resolves to a private/loopback/reserved address: " + uri.getHost());
            }
        } catch (UnknownHostException e) {
            throw new SsrfBlockedException("Could not resolve host: " + uri.getHost());
        }
    }

    private String resolve(String template, Map<String, String> vars) {
        if (template == null) {
            return null;
        }
        Matcher matcher = VARIABLE_TOKEN.matcher(template);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(result, Matcher.quoteReplacement(vars.getOrDefault(matcher.group(1), "")));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    @SuppressWarnings("unchecked")
    private Object resolveDeep(Object value, Map<String, String> vars) {
        if (value instanceof String s) {
            return resolve(s, vars);
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new LinkedHashMap<>();
            map.forEach((k, v) -> result.put(String.valueOf(k), resolveDeep(v, vars)));
            return result;
        }
        if (value instanceof java.util.List<?> list) {
            return list.stream().map(v -> resolveDeep(v, vars)).toList();
        }
        return value;
    }
}
