package com.jouney.admin.domain.flow;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.componentregistry.ComponentCategory;
import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.ComponentStatus;
import com.jouney.admin.domain.sdui.SduiBinding;
import com.jouney.admin.domain.sdui.SduiEvent;
import com.jouney.admin.domain.sdui.SduiNode;
import com.jouney.admin.domain.sdui.SduiVisibility;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Cobre a validação nova de embeddedScreenRoot (catálogo SDUI corporativo v1) adicionada a
 * FlowValidator: id único, type+version existe no Component Registry, filhos só sob nó com
 * allowsChildren, namespace de binding válido, ação de evento é uma das 6 do catálogo. */
class FlowValidatorTest {

    private static final Map<String, ComponentDefinition> REGISTRY = Map.of(
            "ui.screen@1.0", component("ui.screen", true, ComponentStatus.STABLE),
            "ui.stack@1.0", component("ui.stack", true, ComponentStatus.STABLE),
            "ui.textInput@1.0", component("ui.textInput", false, ComponentStatus.STABLE),
            "ui.button@1.0", removedComponent("ui.button"));

    @Test
    void acceptsAValidNestedScreen() {
        SduiNode textInput = new SduiNode("name", "ui.textInput", "1.0", Map.of(), Map.of("value",
                new SduiBinding("form.customerName", "twoWay")), Map.of(), null, List.of());
        SduiNode stack = new SduiNode("stack", "ui.stack", "1.0", Map.of(), Map.of(), Map.of(), null,
                List.of(textInput));
        SduiNode screen = new SduiNode("screen", "ui.screen", "1.0", Map.of(), Map.of(), Map.of(), null,
                List.of(stack));

        validate(screen); // não deve lançar — JUnit falha a exceção sozinho se lançar
    }

    @Test
    void rejectsRootThatIsNotUiScreen() {
        SduiNode root = new SduiNode("stack", "ui.stack", "1.0", Map.of(), Map.of(), Map.of(), null, List.of());
        assertThatThrownBy(() -> validate(root))
                .isInstanceOf(FlowValidationException.class)
                .hasMessageContaining("deve ter raiz do tipo ui.screen");
    }

    @Test
    void rejectsDuplicateIds() {
        SduiNode child1 = leaf("dup");
        SduiNode child2 = leaf("dup");
        SduiNode screen = screenWith(child1, child2);
        assertThatThrownBy(() -> validate(screen)).hasMessageContaining("duplicado");
    }

    @Test
    void rejectsUnknownComponentType() {
        SduiNode unknown = new SduiNode("x", "ui.bogus", "1.0", Map.of(), Map.of(), Map.of(), null, List.of());
        assertThatThrownBy(() -> validate(screenWith(unknown))).hasMessageContaining("não encontrado no Component Registry");
    }

    @Test
    void rejectsRemovedComponent() {
        SduiNode removed = new SduiNode("btn", "ui.button", "1.0", Map.of(), Map.of(), Map.of(), null, List.of());
        assertThatThrownBy(() -> validate(screenWith(removed))).hasMessageContaining("removido do catálogo");
    }

    @Test
    void rejectsChildrenUnderALeafComponent() {
        SduiNode nested = leaf("nested");
        SduiNode leafWithChild = new SduiNode("leaf", "ui.textInput", "1.0", Map.of(), Map.of(), Map.of(), null,
                List.of(nested));
        assertThatThrownBy(() -> validate(screenWith(leafWithChild))).hasMessageContaining("não aceita filhos");
    }

    @Test
    void rejectsBindingWithInvalidNamespace() {
        SduiNode badBinding = new SduiNode("x", "ui.textInput", "1.0", Map.of(),
                Map.of("value", new SduiBinding("secrets.token", "twoWay")), Map.of(), null, List.of());
        assertThatThrownBy(() -> validate(screenWith(badBinding))).hasMessageContaining("binding com path inválido");
    }

    @Test
    void rejectsEventWithActionOutsideTheActionRegistry() {
        SduiNode badEvent = new SduiNode("x", "ui.textInput", "1.0", Map.of(), Map.of(),
                Map.of("onChange", new SduiEvent("action.hack", Map.of())), null, List.of());
        assertThatThrownBy(() -> validate(screenWith(badEvent))).hasMessageContaining("ação inválida");
    }

    @Test
    void allowsChannelTokenInGatewayConditionWithoutDeclaringIt() {
        FlowNode start = new FlowNode("start", FlowNodeType.START, "Start", null, 0, 0, null, null, null, null);
        FlowNode gateway = new FlowNode("gw", FlowNodeType.GATEWAY, "Gateway", null, 0, 0, null, null, null, null);
        FlowNode end1 = new FlowNode("end1", FlowNodeType.END, "End A", null, 0, 0, null, null, null, null);
        FlowNode end2 = new FlowNode("end2", FlowNodeType.END, "End B", null, 0, 0, null, null, null, null);
        List<FlowConnection> connections = List.of(
                new FlowConnection("c1", "start", "gw", null, false),
                new FlowConnection("c2", "gw", "end1", null, true),
                new FlowConnection("c3", "gw", "end2", "{{channel}} == 'WHATSAPP'", false));
        // não deve lançar — "channel" é implícito, não precisa ser declarado em startVariables
        FlowValidator.validate(List.of(start, gateway, end1, end2), connections, REGISTRY);
    }

    @Test
    void rejectsStartVariableNamedChannel() {
        FlowNode start = new FlowNode("start", FlowNodeType.START, "Start", null, 0, 0, null,
                List.of(Map.of("name", "channel", "type", "string")), null, null);
        FlowNode end = new FlowNode("end", FlowNodeType.END, "End", null, 0, 0, null, null, null, null);
        List<FlowConnection> connections = List.of(new FlowConnection("c1", "start", "end", null, false));
        assertThatThrownBy(() -> FlowValidator.validate(List.of(start, end), connections, REGISTRY))
                .hasMessageContaining("nome reservado");
    }

    @Test
    void rejectsScreenWithNoVisibleContentForAConfiguredChannel() {
        SduiNode hiddenForWhatsapp = new SduiNode("field", "ui.textInput", "1.0", Map.of(), Map.of(), Map.of(),
                new SduiVisibility("notEquals", "session.channel", "WHATSAPP"), List.of());
        SduiNode screen = screenWith(hiddenForWhatsapp);
        FlowNode userTask = new FlowNode("task", FlowNodeType.USER_TASK, "Task", null, 0, 0, null, null, null, screen);
        FlowNode start = new FlowNode("start", FlowNodeType.START, "Start", null, 0, 0, null, null, null, null);
        FlowNode end = new FlowNode("end", FlowNodeType.END, "End", null, 0, 0, null, null, null, null);
        List<FlowConnection> connections = List.of(
                new FlowConnection("c1", "start", "task", null, false),
                new FlowConnection("c2", "task", "end", null, false));
        assertThatThrownBy(() -> FlowValidator.validate(List.of(start, userTask, end), connections, REGISTRY,
                List.of(ChannelType.WHATSAPP)))
                .hasMessageContaining("fica sem nenhum componente visível para o canal WHATSAPP");
    }

    @Test
    void acceptsScreenStillVisibleForAChannelNotExcludedByTheRule() {
        SduiNode hiddenForWhatsapp = new SduiNode("field", "ui.textInput", "1.0", Map.of(), Map.of(), Map.of(),
                new SduiVisibility("notEquals", "session.channel", "WHATSAPP"), List.of());
        SduiNode screen = screenWith(hiddenForWhatsapp);
        FlowNode userTask = new FlowNode("task", FlowNodeType.USER_TASK, "Task", null, 0, 0, null, null, null, screen);
        FlowNode start = new FlowNode("start", FlowNodeType.START, "Start", null, 0, 0, null, null, null, null);
        FlowNode end = new FlowNode("end", FlowNodeType.END, "End", null, 0, 0, null, null, null, null);
        List<FlowConnection> connections = List.of(
                new FlowConnection("c1", "start", "task", null, false),
                new FlowConnection("c2", "task", "end", null, false));
        // WEB não é excluído pela regra (só exclui WHATSAPP) — não deve lançar
        FlowValidator.validate(List.of(start, userTask, end), connections, REGISTRY, List.of(ChannelType.WEB));
    }

    private static SduiNode leaf(String id) {
        return new SduiNode(id, "ui.textInput", "1.0", Map.of(), Map.of(), Map.of(), null, List.of());
    }

    private static SduiNode screenWith(SduiNode... children) {
        return new SduiNode("screen", "ui.screen", "1.0", Map.of(), Map.of(), Map.of(), null, List.of(children));
    }

    private static void validate(SduiNode root) {
        FlowNode userTask = new FlowNode("task", FlowNodeType.USER_TASK, "Task", null, 0, 0, null, null, null, root);
        FlowNode start = new FlowNode("start", FlowNodeType.START, "Start", null, 0, 0, null, null, null, null);
        FlowNode end = new FlowNode("end", FlowNodeType.END, "End", null, 0, 0, null, null, null, null);
        List<FlowConnection> connections = List.of(
                new FlowConnection("c1", "start", "task", null, false),
                new FlowConnection("c2", "task", "end", null, false));
        FlowValidator.validate(List.of(start, userTask, end), connections, REGISTRY);
    }

    private static ComponentDefinition component(String type, boolean allowsChildren, ComponentStatus status) {
        return ComponentDefinition.create(type, "1.0", status, 1, ComponentCategory.INPUT, allowsChildren, List.of(),
                List.of(), List.of(), Map.of());
    }

    private static ComponentDefinition removedComponent(String type) {
        return component(type, false, ComponentStatus.REMOVED);
    }
}
