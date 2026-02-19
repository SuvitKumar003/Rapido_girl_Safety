package com.samsung.safety.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "incidents")
public class Incident {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sessionId;
    private String type;
    private String message;
    private String passengerName;
    private String vehicleNumber;
    private String jurisdiction;
    
    @Column(length = 2048)
    private String dispatchLink;

    private Double latitude;
    private Double longitude;
    
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}
