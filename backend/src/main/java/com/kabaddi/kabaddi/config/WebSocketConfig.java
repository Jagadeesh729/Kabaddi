package com.kabaddi.kabaddi.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import com.kabaddi.kabaddi.auth.JwtUtils;
import org.springframework.security.core.Authentication;

@Configuration
@RequiredArgsConstructor
@EnableWebSocketMessageBroker // Enables WebSocket message handling, backed by a message broker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final JwtUtils jwtUtils;
    @Value("${frontend.url}")
    private String frontendUrl;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // This line enables a simple in-memory message broker
        // that carries messages back to the client on destinations prefixed with
        // "/topic".
        // This is where clients will subscribe to receive updates.
        config.enableSimpleBroker("/topic");

        // This line designates the "/app" prefix for messages that are bound for
        // methods
        // annotated with @MessageMapping. These messages are typically sent by clients.
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // This registers the "/ws" endpoint, enabling SockJS fallback options.
        // SockJS is used when the browser does not support WebSockets directly.
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(
                    "http://localhost:5173",
                    "https://*.vercel.app",
                    "https://*.onrender.com",
                    frontendUrl
                )
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (accessor != null && accessor.getCommand() != null) {
                    System.out.println("[WS Interceptor] Command: " + accessor.getCommand() + ", Destination: " + accessor.getDestination());
                }

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String token = accessor.getFirstNativeHeader("Authorization");
                    if (token != null && token.startsWith("Bearer ")) {
                        String jwt = token.substring(7);
                        Authentication auth = jwtUtils.getAuthentication(jwt);
                        if (auth != null) {
                            accessor.setUser(auth);
                        } else {
                            // If token is provided but invalid, we reject for security
                            throw new MessageDeliveryException("Unauthorized: Invalid JWT");
                        }
                    }
                    // If no token is provided, we allow the connection as an anonymous user (guest)
                    // This allows public score view to work.
                }

                // Allow all SUBSCRIBE commands regardless of auth state, 
                // as FanZone allows guest access to chat viewing.
                return message;
            }
        });
    }

}
