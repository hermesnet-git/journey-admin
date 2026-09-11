package com.jouney.admin.infrastructure.publication;

import java.net.SocketTimeoutException;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** {@link RestClient#create()} usa o HttpClient do JDK sem nenhum timeout — um serviço que aceita
 * a conexão mas nunca responde trava a chamada pra sempre. Usado por {@link PublicationAdapter} e
 * {@link EspecRegistrySduiAdapter}, e por qualquer outro adapter deste pacote pra frente que fale
 * HTTP com um serviço externo — todos precisam identificar esse caso específico (em vez do texto
 * genérico de {@link Throwable#getMessage()}) pra dar uma mensagem legível ao usuário. Público:
 * reaproveitado fora deste pacote (ex.: infrastructure.execution). */
public final class TimeoutAwareRestClient {

    private TimeoutAwareRestClient() {
    }

    public static RestClient create(Duration connectTimeout, Duration readTimeout) {
        // version(HTTP_1_1): o default do HttpClient do JDK tenta negociar upgrade HTTP/2 (h2c)
        // mesmo em conexão sem TLS — contra um servidor Node/Koa (ex.: o Strapi por trás do
        // ms-espec-registry) que não suporta esse upgrade, a negociação trava a conexão inteira sem
        // erro nenhum (causa raiz confirmada do travamento do publish). Forçado aqui também pros
        // alvos Spring/Tomcat por segurança, já que HTTP/2 não traz benefício nenhum pra chamadas
        // locais serviço-a-serviço.
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(connectTimeout).build());
        factory.setReadTimeout(readTimeout);
        return RestClient.builder().requestFactory(factory).build();
    }

    public static boolean isTimeout(Throwable e) {
        for (Throwable current = e; current != null; current = current.getCause()) {
            if (current instanceof HttpTimeoutException || current instanceof SocketTimeoutException) {
                return true;
            }
        }
        return false;
    }
}
