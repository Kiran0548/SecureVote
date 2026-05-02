package com.securevote.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class ElectionMetadata {

    @Id
    private Long electionId;

    private String electionType;
    private String district;
    private String localBody;
    private String wardNumber;

    public ElectionMetadata() {}

    public Long getElectionId() {
        return electionId;
    }

    public void setElectionId(Long electionId) {
        this.electionId = electionId;
    }

    public String getElectionType() {
        return electionType;
    }

    public void setElectionType(String electionType) {
        this.electionType = electionType;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getLocalBody() {
        return localBody;
    }

    public void setLocalBody(String localBody) {
        this.localBody = localBody;
    }

    public String getWardNumber() {
        return wardNumber;
    }

    public void setWardNumber(String wardNumber) {
        this.wardNumber = wardNumber;
    }
}
