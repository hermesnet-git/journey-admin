package com.jouney.admin.interfaces.channel;

import com.jouney.admin.application.channel.ActivateChannel;
import com.jouney.admin.application.channel.DeactivateChannel;
import com.jouney.admin.application.channel.GetChannel;
import com.jouney.admin.application.channel.UpdateChannel;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/channels")
public class ChannelController {

    private final GetChannel getChannel;
    private final UpdateChannel updateChannel;
    private final DeactivateChannel deactivateChannel;
    private final ActivateChannel activateChannel;

    public ChannelController(GetChannel getChannel, UpdateChannel updateChannel, DeactivateChannel deactivateChannel,
                              ActivateChannel activateChannel) {
        this.getChannel = getChannel;
        this.updateChannel = updateChannel;
        this.deactivateChannel = deactivateChannel;
        this.activateChannel = activateChannel;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/{channelId}")
    public ChannelResponse get(@PathVariable UUID channelId) {
        return ChannelResponse.from(getChannel.execute(channelId));
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PutMapping("/{channelId}")
    public ChannelResponse update(@PathVariable UUID channelId, @Valid @RequestBody ChannelInput input) {
        updateChannel.execute(channelId, input.name(), input.description(), input.type());
        return ChannelResponse.from(getChannel.execute(channelId));
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/{channelId}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable UUID channelId) {
        deactivateChannel.execute(channelId);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/{channelId}/activate")
    public ResponseEntity<Void> activate(@PathVariable UUID channelId) {
        activateChannel.execute(channelId);
        return ResponseEntity.ok().build();
    }
}
