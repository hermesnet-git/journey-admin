package com.jouney.admin.domain.form;

import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.annotation.JsonDeserialize;

/**
 * Tolerates the pre-refino EP-04 shape (a plain string) when reading old, already-published
 * snapshots — publications/versions are immutable once written, so legacy JSON must remain
 * readable forever, even after the field model evolves.
 */
@JsonDeserialize(using = FormFieldOption.LegacyDeserializer.class)
public record FormFieldOption(String label, String value) {

    static final class LegacyDeserializer extends ValueDeserializer<FormFieldOption> {
        @Override
        public FormFieldOption deserialize(JsonParser p, DeserializationContext ctxt) {
            if (p.currentToken() == JsonToken.VALUE_STRING) {
                String text = p.getString();
                return new FormFieldOption(text, text);
            }
            JsonNode node = ctxt.readTree(p);
            return new FormFieldOption(node.path("label").asString(), node.path("value").asString());
        }
    }
}
