package com.propertypro.property_platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PropertyPlatformApplication {

	public static void main(String[] args) {
		SpringApplication.run(PropertyPlatformApplication.class, args);
	}

}
