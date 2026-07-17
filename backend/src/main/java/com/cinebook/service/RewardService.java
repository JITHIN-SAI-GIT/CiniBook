package com.cinebook.service;

import com.cinebook.entity.*;
import com.cinebook.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RewardService {

    private final RewardRepository rewardRepository;
    private final VoucherRepository voucherRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final UserRepository userRepository;

    @Transactional
    public void processBookingRewards(User user, int newSeatsBooked) {
        user.setLifetimeTickets(user.getLifetimeTickets() + newSeatsBooked);
        user.setTicketsSinceLastReward(user.getTicketsSinceLastReward() + newSeatsBooked);
        
        // Get threshold from DB or default to 10
        int threshold = systemConfigRepository.findById("REWARD_TICKET_THRESHOLD")
                .map(config -> Integer.parseInt(config.getValue()))
                .orElse(10);
                
        while (user.getTicketsSinceLastReward() >= threshold) {
            user.setTicketsSinceLastReward(user.getTicketsSinceLastReward() - threshold);
            
            // Try to find an available voucher
            Optional<Voucher> availableVoucherOpt = voucherRepository.findFirstByStatus(Voucher.RedemptionStatus.AVAILABLE);
            
            Reward reward = Reward.builder()
                    .user(user)
                    .status(Reward.RewardStatus.AVAILABLE)
                    .build();
                    
            if (availableVoucherOpt.isPresent()) {
                Voucher voucher = availableVoucherOpt.get();
                voucher.setStatus(Voucher.RedemptionStatus.ASSIGNED);
                voucherRepository.save(voucher);
                reward.setVoucher(voucher);
            }
            // If no voucher available, it creates the reward without a voucher. 
            // Admin can assign later, or it stays pending. We'll let it be null.
            
            rewardRepository.save(reward);
        }
        userRepository.save(user);
    }
}
