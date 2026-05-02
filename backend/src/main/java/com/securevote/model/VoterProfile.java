package com.securevote.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class VoterProfile {

    @Id
    private String walletAddress;

    private String fullName;
    private String district;
    private String localBody;
    private String wardNumber;
    private String idReferenceMasked;

    public VoterProfile() {}

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
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

    public String getIdReferenceMasked() {
        return idReferenceMasked;
    }

    public void setIdReferenceMasked(String idReferenceMasked) {
        this.idReferenceMasked = idReferenceMasked;
    }
}
