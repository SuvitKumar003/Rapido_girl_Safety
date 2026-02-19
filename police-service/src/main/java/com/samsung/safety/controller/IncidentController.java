package com.samsung.safety.controller;

import com.samsung.safety.model.Incident;
import com.samsung.safety.repository.IncidentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incidents")
@CrossOrigin(origins = "*") // Allow Dashboard and Node.js access
public class IncidentController {

    @Autowired
    private IncidentRepository incidentRepository;

    @Value("${samsung.knox.api.key}")
    private String secureApiKey;

    @PostMapping
    public org.springframework.http.ResponseEntity<?> reportIncident(@RequestBody Incident incident,
            @RequestHeader(value = "x-api-key", required = false) String apiKey) {
        if (!secureApiKey.equals(apiKey)) {
            System.out.println("⛔ SECURITY ALERT: Invalid API Key attempt.");
            return org.springframework.http.ResponseEntity.status(403).body("Access Denied: Invalid Knox Key");
        }

        System.out.println("🚨 ENTERPRISE LOG: New Incident Reported - " + incident.getType());
        return org.springframework.http.ResponseEntity.ok(incidentRepository.save(incident));
    }

    @GetMapping
    public List<Incident> getAllIncidents() {
        return incidentRepository.findAllByOrderByTimestampDesc();
    }

    @GetMapping("/session/{sessionId}")
    public List<Incident> getBySession(@PathVariable String sessionId) {
        return incidentRepository.findBySessionId(sessionId);
    }
}
