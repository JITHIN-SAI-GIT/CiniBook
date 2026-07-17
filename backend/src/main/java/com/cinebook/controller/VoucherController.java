package com.cinebook.controller;

import com.cinebook.entity.Voucher;
import com.cinebook.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherRepository voucherRepository;

    @GetMapping
    public ResponseEntity<List<Voucher>> getAll() {
        return ResponseEntity.ok(voucherRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Voucher> create(@RequestBody Voucher req) {
        return ResponseEntity.ok(voucherRepository.save(req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        voucherRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
