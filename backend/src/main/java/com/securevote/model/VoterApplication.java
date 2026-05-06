package com.securevote.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;

import java.time.Instant;

@Entity
public class VoterApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String walletAddress;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String district;

    @Column(nullable = false)
    private String localBody;

    @Column(nullable = false)
    private String wardNumber;

    @Column(nullable = false)
    private String registrationType;

    private String idReferenceMasked;
    private String idProofPath;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String idProofDataUrl;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String photoDataUrl;

    private String gender;

    @Column(nullable = false)
    private String status;

    private Instant submittedAt;
    private Instant reviewedAt;
    private String reviewNote;

    public VoterApplication() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public String getRegistrationType() {
        return registrationType;
    }

    public void setRegistrationType(String registrationType) {
        this.registrationType = registrationType;
    }

    public String getIdReferenceMasked() {
        return idReferenceMasked;
    }

    public void setIdReferenceMasked(String idReferenceMasked) {
        this.idReferenceMasked = idReferenceMasked;
    }

    public String getIdProofPath() {
        return idProofPath;
    }

    public void setIdProofPath(String idProofPath) {
        this.idProofPath = idProofPath;
    }

    public String getIdProofDataUrl() {
        return idProofDataUrl;
    }

    public void setIdProofDataUrl(String idProofDataUrl) {
        this.idProofDataUrl = idProofDataUrl;
    }

    public String getPhotoDataUrl() {
        return photoDataUrl;
    }

    public void setPhotoDataUrl(String photoDataUrl) {
        this.photoDataUrl = photoDataUrl;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public String getReviewNote() {
        return reviewNote;
    }

    public void setReviewNote(String reviewNote) {
        this.reviewNote = reviewNote;
    }
}
